"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function assertCourseOwner(courseId: number, userId: string, role: string) {
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId }, select: { authorId: true } });
  if (role !== "ADMIN" && course.authorId !== userId) throw new Error("Forbidden");
}

export async function createSection(courseId: number, title: string, description?: string) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  await assertCourseOwner(courseId, user.id, user.role);

  const maxOrder = await prisma.courseSection.aggregate({ where: { courseId }, _max: { order: true } });
  const order = (maxOrder._max.order ?? 0) + 10;

  await prisma.courseSection.create({ data: { courseId, title, description, order } });
  revalidatePath(`/teach/${courseId}`);
}

export async function updateSection(sectionId: number, title: string, description?: string) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const section = await prisma.courseSection.findUniqueOrThrow({ where: { id: sectionId }, select: { courseId: true } });
  await assertCourseOwner(section.courseId, user.id, user.role);

  await prisma.courseSection.update({ where: { id: sectionId }, data: { title, description } });
  revalidatePath(`/teach/${section.courseId}`);
}

export async function deleteSection(sectionId: number) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const section = await prisma.courseSection.findUniqueOrThrow({ where: { id: sectionId }, select: { courseId: true } });
  await assertCourseOwner(section.courseId, user.id, user.role);

  // Unassign lessons from section before deleting
  await prisma.lesson.updateMany({ where: { sectionId }, data: { sectionId: null } });
  await prisma.courseSection.delete({ where: { id: sectionId } });
  revalidatePath(`/teach/${section.courseId}`);
}

export async function reorderSections(courseId: number, orderedIds: number[]) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  await assertCourseOwner(courseId, user.id, user.role);

  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.courseSection.update({ where: { id }, data: { order: (idx + 1) * 10 } })
    )
  );
  revalidatePath(`/teach/${courseId}`);
}

export async function moveSectionUp(sectionId: number) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const section = await prisma.courseSection.findUniqueOrThrow({ where: { id: sectionId } });
  await assertCourseOwner(section.courseId, user.id, user.role);

  const prev = await prisma.courseSection.findFirst({
    where: { courseId: section.courseId, order: { lt: section.order } },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.courseSection.update({ where: { id: section.id }, data: { order: prev.order } }),
    prisma.courseSection.update({ where: { id: prev.id }, data: { order: section.order } }),
  ]);
  revalidatePath(`/teach/${section.courseId}`);
}

export async function moveSectionDown(sectionId: number) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const section = await prisma.courseSection.findUniqueOrThrow({ where: { id: sectionId } });
  await assertCourseOwner(section.courseId, user.id, user.role);

  const next = await prisma.courseSection.findFirst({
    where: { courseId: section.courseId, order: { gt: section.order } },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.courseSection.update({ where: { id: section.id }, data: { order: next.order } }),
    prisma.courseSection.update({ where: { id: next.id }, data: { order: section.order } }),
  ]);
  revalidatePath(`/teach/${section.courseId}`);
}

export async function moveLessonToSection(lessonId: number, sectionId: number | null) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { courseId: true } });
  await assertCourseOwner(lesson.courseId, user.id, user.role);

  await prisma.lesson.update({ where: { id: lessonId }, data: { sectionId } });
  revalidatePath(`/teach/${lesson.courseId}`);
}

export async function attachSectionQuiz(
  sectionId: number,
  quizId: number,
  isGate = true,
  placement: "BEFORE" | "AFTER" = "AFTER",
) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const section = await prisma.courseSection.findUniqueOrThrow({ where: { id: sectionId }, select: { courseId: true } });
  await assertCourseOwner(section.courseId, user.id, user.role);

  await prisma.sectionQuiz.upsert({
    where: { sectionId_quizId: { sectionId, quizId } },
    update: { isGate, placement },
    create: { sectionId, quizId, isGate, placement, order: 0 },
  });
  revalidatePath(`/teach/${section.courseId}`);
}

export async function detachSectionQuiz(sectionId: number, quizId: number) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const section = await prisma.courseSection.findUniqueOrThrow({ where: { id: sectionId }, select: { courseId: true } });
  await assertCourseOwner(section.courseId, user.id, user.role);

  await prisma.sectionQuiz.delete({ where: { sectionId_quizId: { sectionId, quizId } } });
  revalidatePath(`/teach/${section.courseId}`);
}
