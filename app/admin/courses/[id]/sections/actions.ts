"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { attachSectionQuiz, detachSectionQuiz } from "@/app/teach/[courseId]/sections/actions";

async function assertCourseAccess(courseId: number) {
  await requireRole("INSTRUCTOR", "ADMIN");
}

export async function createSectionAdmin(courseId: number, formData: FormData) {
  await assertCourseAccess(courseId);
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Title required");

  const maxOrder = await prisma.courseSection.aggregate({ where: { courseId }, _max: { order: true } });
  const order = (maxOrder._max.order ?? 0) + 10;

  await prisma.courseSection.create({ data: { courseId, title, order } });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/teach/${courseId}`);
}

export async function updateSectionAdmin(sectionId: number, courseId: number, formData: FormData) {
  await assertCourseAccess(courseId);
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Title required");

  await prisma.courseSection.update({ where: { id: sectionId }, data: { title } });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/teach/${courseId}`);
}

export async function deleteSectionAdmin(sectionId: number, courseId: number) {
  await assertCourseAccess(courseId);
  // Unassign lessons from section before deleting (lessons are NOT deleted)
  await prisma.lesson.updateMany({ where: { sectionId }, data: { sectionId: null } });
  await prisma.courseSection.delete({ where: { id: sectionId } });
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/teach/${courseId}`);
}

export async function attachSectionQuizAdmin(
  sectionId: number,
  courseId: number,
  formData: FormData,
) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const quizId = parseInt(formData.get("quizId") as string);
  const placement = (formData.get("placement") as "BEFORE" | "AFTER") ?? "AFTER";
  const isGate = formData.get("isGate") === "true";
  await attachSectionQuiz(sectionId, quizId, isGate, placement);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function detachSectionQuizAdmin(
  sectionId: number,
  quizId: number,
  courseId: number,
) {
  await requireRole("INSTRUCTOR", "ADMIN");
  await detachSectionQuiz(sectionId, quizId);
  revalidatePath(`/admin/courses/${courseId}`);
}
