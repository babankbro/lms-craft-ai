"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, canReview } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { NotificationType } from "@prisma/client";

async function requireReviewAccess(submissionId: number) {
  const user = await requireAuth();
  if (!canReview(user.role)) throw new Error("Forbidden");

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { lesson: { include: { course: true } } } } },
  });
  if (!submission) throw new Error("Submission not found");

  // MENTOR: only own mentees
  if (user.role === "MENTOR") {
    const student = await prisma.user.findUnique({ where: { id: submission.studentId }, select: { mentorId: true } });
    if (student?.mentorId !== user.id) throw new Error("Forbidden: not your mentee");
  }
  // INSTRUCTOR: only own courses
  if (user.role === "INSTRUCTOR") {
    const course = submission.assignment.lesson.course;
    if (course.authorId !== user.id) throw new Error("Forbidden: not your course");
  }

  return { user, submission };
}

export async function claimReview(submissionId: number) {
  const { user, submission } = await requireReviewAccess(submissionId);
  if (submission.status !== "SUBMITTED") throw new Error("Can only claim SUBMITTED submissions");

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "UNDER_REVIEW", reviewedBy: user.id },
  });

  revalidatePath("/review");
  revalidatePath(`/review/${submissionId}`);
}

export async function releaseReview(submissionId: number) {
  const { submission } = await requireReviewAccess(submissionId);
  if (submission.status !== "UNDER_REVIEW") throw new Error("Can only release UNDER_REVIEW submissions");

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "SUBMITTED", reviewedBy: null },
  });

  revalidatePath("/review");
  revalidatePath(`/review/${submissionId}`);
}

export async function approveSubmission(submissionId: number, score: number, feedback: string) {
  const { user, submission } = await requireReviewAccess(submissionId);
  if (![ "SUBMITTED", "UNDER_REVIEW" ].includes(submission.status)) {
    throw new Error("Can only approve SUBMITTED or UNDER_REVIEW submissions");
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "APPROVED",
      score,
      feedback,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: submission.studentId,
      type: "SUBMISSION_REVIEWED" as NotificationType,
      title: "งานผ่านการตรวจแล้ว",
      message: `คะแนน: ${score} — ${feedback}`,
      link: `/submissions/${submissionId}`,
    },
  });

  revalidatePath("/review");
  revalidatePath(`/review/${submissionId}`);
  revalidatePath("/submissions");
}

export async function requestRevision(submissionId: number, score: number | null, feedback: string) {
  const { user, submission } = await requireReviewAccess(submissionId);
  if (![ "SUBMITTED", "UNDER_REVIEW" ].includes(submission.status)) {
    throw new Error("Can only request revision on SUBMITTED or UNDER_REVIEW submissions");
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "REVISION_REQUESTED",
      score: score ?? undefined,
      feedback,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: submission.studentId,
      type: "REVISION_REQUESTED" as NotificationType,
      title: "กรุณาแก้ไขงาน",
      message: feedback,
      link: `/submissions/${submissionId}`,
    },
  });

  revalidatePath("/review");
  revalidatePath(`/review/${submissionId}`);
  revalidatePath("/submissions");
}

export async function addComment(
  submissionId: number,
  content: string,
  isInternal = false
) {
  const user = await requireAuth();

  // STUDENT can only add non-internal comments
  if (user.role === "STUDENT" && isInternal) throw new Error("Students cannot post internal comments");

  await prisma.submissionComment.create({
    data: { submissionId, authorId: user.id, content, isInternal },
  });

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { studentId: true },
  });

  // Only notify for non-internal comments
  if (!isInternal) {
    const targetUserId =
      user.id === submission?.studentId
        ? (
            await prisma.user.findUnique({
              where: { id: user.id },
              select: { mentorId: true },
            })
          )?.mentorId
        : submission?.studentId;

    if (targetUserId) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: "FEEDBACK_RECEIVED" as NotificationType,
          title: "ข้อเสนอแนะใหม่",
          message: "มีความคิดเห็นใหม่ในงานของคุณ",
          link: `/submissions/${submissionId}`,
        },
      });
    }
  }

  revalidatePath(`/review/${submissionId}`);
  revalidatePath(`/submissions/${submissionId}`);
}
