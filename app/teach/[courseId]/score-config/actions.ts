"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function requireCourseAuthor(courseId: number) {
  const user = await requireAuth();
  if (!canAuthor(user.role)) throw new Error("Forbidden");
  if (user.role !== "ADMIN") {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { authorId: true } });
    if (course?.authorId !== user.id) throw new Error("Forbidden: not course author");
  }
  return user;
}

export async function saveScoreConfig(courseId: number, formData: FormData): Promise<void> {
  await requireCourseAuthor(courseId);

  const lessonQuizWeight      = parseFloat(formData.get("lessonQuizWeight") as string);
  const sectionQuizWeight     = parseFloat(formData.get("sectionQuizWeight") as string);
  const lessonAssignmentWeight = parseFloat(formData.get("lessonAssignmentWeight") as string);
  const courseAssignmentWeight = parseFloat(formData.get("courseAssignmentWeight") as string);

  const vals = [lessonQuizWeight, sectionQuizWeight, lessonAssignmentWeight, courseAssignmentWeight];
  if (vals.some((v) => isNaN(v) || v < 0 || v > 100)) throw new Error("Each weight must be 0–100");
  const total = vals.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.01) throw new Error(`Weights must sum to 100 (got ${total})`);

  await prisma.courseScoreConfig.upsert({
    where: { courseId },
    update: { lessonQuizWeight, sectionQuizWeight, lessonAssignmentWeight, courseAssignmentWeight },
    create: { courseId, lessonQuizWeight, sectionQuizWeight, lessonAssignmentWeight, courseAssignmentWeight },
  });

  revalidatePath(`/teach/${courseId}/score-config`);
  revalidatePath(`/teach/${courseId}`);
}
