"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { canRecallSubmission } from "@/lib/submission-state";
import { revalidatePath } from "next/cache";

export async function recallSubmissionFromList(submissionId: number) {
  const user = await requireAuth();

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      studentId: true,
      status: true,
      assignment: {
        select: {
          dueDate: true,
          lesson: {
            select: {
              id: true,
              course: { select: { slug: true } },
            },
          },
          course: { select: { slug: true } },
        },
      },
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

  revalidatePath("/submissions");
  revalidatePath(`/submissions/${submissionId}`);

  if (sub.assignment.lesson) {
    const slug = sub.assignment.lesson.course.slug;
    const lessonId = sub.assignment.lesson.id;
    revalidatePath(`/courses/${slug}/lessons/${lessonId}`);
  } else if (sub.assignment.course) {
    revalidatePath(`/courses/${sub.assignment.course.slug}`);
  }
}
