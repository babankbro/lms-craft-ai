"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function linkQuizTarget(
  quizId: number,
  courseId: number,
  formData: FormData,
): Promise<void> {
  await requireRole("INSTRUCTOR", "ADMIN");

  const raw = (formData.get("target") as string) ?? "none";
  const [targetType, targetIdStr] = raw.includes(":") ? raw.split(":") : [raw, "0"];
  const targetId = parseInt(targetIdStr) || 0;

  // Detach all existing lesson links for this quiz in this course
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: { id: true },
  });
  const lessonIds = lessons.map((l) => l.id);
  if (lessonIds.length > 0) {
    await prisma.lessonQuiz.deleteMany({
      where: { quizId, lessonId: { in: lessonIds } },
    });
  }

  // Detach all existing section links for this quiz in this course
  const sections = await prisma.courseSection.findMany({
    where: { courseId },
    select: { id: true },
  });
  const sectionIds = sections.map((s) => s.id);
  if (sectionIds.length > 0) {
    await prisma.sectionQuiz.deleteMany({
      where: { quizId, sectionId: { in: sectionIds } },
    });
  }

  // Attach new target
  if (targetType === "lesson" && targetId) {
    await prisma.lessonQuiz.create({ data: { lessonId: targetId, quizId, order: 0 } });
  } else if (targetType === "section" && targetId) {
    await prisma.sectionQuiz.create({
      data: { sectionId: targetId, quizId, isGate: false, placement: "AFTER", order: 0 },
    });
  }

  revalidatePath(`/teach/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}`);
}
