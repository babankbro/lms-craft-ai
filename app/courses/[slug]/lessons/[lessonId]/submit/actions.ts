"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { assertEditable, canRecallSubmission } from "@/lib/submission-state";
import { revalidatePath } from "next/cache";
import { NotificationType } from "@prisma/client";

async function requireStudentOwnsSubmission(submissionId: number, userId: string) {
  const sub = await prisma.submission.findUnique({ where: { id: submissionId }, select: { studentId: true, status: true } });
  if (!sub) throw new Error("Submission not found");
  if (sub.studentId !== userId) throw new Error("Forbidden");
  return sub;
}

export async function startDraftSubmission(assignmentId: number): Promise<number> {
  const user = await requireAuth();

  const existing = await prisma.submission.findFirst({
    where: { assignmentId, studentId: user.id, status: { in: ["DRAFT", "REVISION_REQUESTED"] } },
  });
  if (existing) return existing.id;

  const sub = await prisma.submission.create({
    data: { assignmentId, studentId: user.id, status: "DRAFT" },
  });
  return sub.id;
}

export async function attachSubmissionFile(
  submissionId: number,
  meta: { fileName: string; fileKey: string; fileSize: number; mimeType: string }
) {
  const user = await requireAuth();
  const sub = await requireStudentOwnsSubmission(submissionId, user.id);
  assertEditable(sub.status);

  await prisma.submissionFile.create({
    data: { submissionId, ...meta },
  });

  revalidatePath("/submissions");
}

export async function removeSubmissionFile(fileId: number) {
  const user = await requireAuth();

  const file = await prisma.submissionFile.findUnique({
    where: { id: fileId },
    include: { submission: { select: { studentId: true, status: true } } },
  });
  if (!file) throw new Error("File not found");
  if (file.submission.studentId !== user.id) throw new Error("Forbidden");
  assertEditable(file.submission.status);

  await prisma.submissionFile.delete({ where: { id: fileId } });
  revalidatePath("/submissions");
}

export async function submitSubmission(submissionId: number, slug: string, lessonId: number | null) {
  const user = await requireAuth();
  const sub = await requireStudentOwnsSubmission(submissionId, user.id);
  if (sub.status !== "DRAFT") throw new Error("Can only submit a DRAFT");

  // Require at least a file OR answered questions
  const fileCount = await prisma.submissionFile.count({ where: { submissionId } });
  const answerCount = await (prisma.submissionAnswer as any).count({ where: { submissionId } });
  if (fileCount === 0 && answerCount === 0)
    throw new Error("Must attach a file or answer at least one question before submitting");

  const now = new Date();
  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      firstSubmittedAt: now,
    },
    include: {
      assignment: { select: { title: true } },
      student: { select: { mentorId: true } },
    },
  });

  // Notify mentor if paired
  if (updated.student?.mentorId) {
    await prisma.notification.create({
      data: {
        userId: updated.student.mentorId,
        type: "SUBMISSION_RECEIVED" as NotificationType,
        title: "มีงานใหม่รอตรวจ",
        message: `ส่งงาน "${updated.assignment.title}"`,
        link: `/review/${submissionId}`,
      },
    });
  }

  if (lessonId != null) revalidatePath(`/courses/${slug}/lessons/${lessonId}`);
  else revalidatePath(`/courses/${slug}`);
  revalidatePath("/submissions");
}

export async function saveAnswerText(
  submissionId: number,
  questionId: number,
  textAnswer: string,
) {
  const user = await requireAuth();
  const sub = await requireStudentOwnsSubmission(submissionId, user.id);
  assertEditable(sub.status);

  await (prisma.submissionAnswer as any).upsert({
    where: { submissionId_questionId: { submissionId, questionId } },
    update: { textAnswer },
    create: { submissionId, questionId, textAnswer },
  });

  revalidatePath("/submissions");
}

export async function attachAnswerFile(
  submissionId: number,
  questionId: number,
  meta: { fileName: string; fileKey: string; fileSize: number; mimeType: string },
) {
  const user = await requireAuth();
  const sub = await requireStudentOwnsSubmission(submissionId, user.id);
  assertEditable(sub.status);

  // Upsert the answer record first
  const answer = await (prisma.submissionAnswer as any).upsert({
    where: { submissionId_questionId: { submissionId, questionId } },
    update: {},
    create: { submissionId, questionId, textAnswer: null },
  });

  await (prisma.submissionFile as any).create({
    data: { submissionId, answerId: answer.id, ...meta },
  });

  revalidatePath("/submissions");
}

export async function resubmitSubmission(submissionId: number, slug: string, lessonId: number | null) {
  const user = await requireAuth();
  const sub = await requireStudentOwnsSubmission(submissionId, user.id);
  if (sub.status !== "REVISION_REQUESTED") throw new Error("Can only resubmit after revision request");

  const fileCount = await prisma.submissionFile.count({ where: { submissionId } });
  if (fileCount === 0) throw new Error("Must attach at least one file before resubmitting");

  const now = new Date();
  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "SUBMITTED",
      submittedAt: now,
      reviewCycle: { increment: 1 },
    },
    include: {
      assignment: { select: { title: true } },
      student: { select: { mentorId: true } },
    },
  });

  if (updated.student?.mentorId) {
    await prisma.notification.create({
      data: {
        userId: updated.student.mentorId,
        type: "SUBMISSION_RECEIVED" as NotificationType,
        title: "มีงานแก้ไขรอตรวจ",
        message: `ส่งงานแก้ไข "${updated.assignment.title}" รอบที่ ${updated.reviewCycle}`,
        link: `/review/${submissionId}`,
      },
    });
  }

  if (lessonId != null) revalidatePath(`/courses/${slug}/lessons/${lessonId}`);
  else revalidatePath(`/courses/${slug}`);
  revalidatePath("/submissions");
}

export async function recallSubmission(submissionId: number, slug: string, lessonId: number | null) {
  const user = await requireAuth();

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      studentId: true,
      status: true,
      assignment: { select: { dueDate: true } },
    },
  });
  if (!sub) throw new Error("Submission not found");
  if (sub.studentId !== user.id) throw new Error("Forbidden");
  if (!canRecallSubmission(sub.status, sub.assignment.dueDate))
    throw new Error("Cannot recall: deadline passed or submission is not in SUBMITTED state");

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "DRAFT", submittedAt: null },
  });

  if (lessonId != null) revalidatePath(`/courses/${slug}/lessons/${lessonId}`);
  else revalidatePath(`/courses/${slug}`);
  revalidatePath("/submissions");
}
