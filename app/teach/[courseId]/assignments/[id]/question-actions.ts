"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function requireAuthorOfAssignment(assignmentId: number) {
  const user = await requireAuth();
  if (!canAuthor(user.role)) throw new Error("Forbidden");
  const assignment = await (prisma.assignment as any).findUnique({
    where: { id: assignmentId },
    include: {
      lesson: { select: { courseId: true, course: { select: { authorId: true } } } },
      course: { select: { id: true, authorId: true } },
    },
  });
  if (!assignment) throw new Error("Assignment not found");
  const authorId = assignment.lesson?.course.authorId ?? assignment.course?.authorId;
  if (user.role !== "ADMIN" && authorId !== user.id) throw new Error("Forbidden");
  const courseId = assignment.lesson?.courseId ?? assignment.course?.id;
  return { user, courseId: courseId as number };
}

export async function addQuestion(assignmentId: number, formData: FormData) {
  const { courseId } = await requireAuthorOfAssignment(assignmentId);

  const prompt = (formData.get("prompt") as string)?.trim();
  if (!prompt) throw new Error("Question prompt is required");

  const responseType = (formData.get("responseType") as string) || "TEXT";
  const required = formData.get("required") !== "false";
  const maxLengthRaw = formData.get("maxLength") as string;
  const maxLength = maxLengthRaw ? parseInt(maxLengthRaw) : null;
  const maxFilesRaw = formData.get("maxFiles") as string;
  const maxFiles = maxFilesRaw ? parseInt(maxFilesRaw) : null;

  // Determine next order
  const lastQ = await (prisma.assignmentQuestion as any).findFirst({
    where: { assignmentId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = lastQ ? lastQ.order + 1 : 1;

  await (prisma.assignmentQuestion as any).create({
    data: { assignmentId, order, prompt, responseType, required, maxLength, maxFiles },
  });

  revalidatePath(`/teach/${courseId}/assignments/${assignmentId}`);
}

export async function updateQuestion(questionId: number, assignmentId: number, formData: FormData) {
  const { courseId } = await requireAuthorOfAssignment(assignmentId);

  const prompt = (formData.get("prompt") as string)?.trim();
  if (!prompt) throw new Error("Question prompt is required");

  const responseType = (formData.get("responseType") as string) || "TEXT";
  const required = formData.get("required") !== "false";
  const maxLengthRaw = formData.get("maxLength") as string;
  const maxLength = maxLengthRaw ? parseInt(maxLengthRaw) : null;
  const maxFilesRaw = formData.get("maxFiles") as string;
  const maxFiles = maxFilesRaw ? parseInt(maxFilesRaw) : null;

  await (prisma.assignmentQuestion as any).update({
    where: { id: questionId },
    data: { prompt, responseType, required, maxLength, maxFiles },
  });

  revalidatePath(`/teach/${courseId}/assignments/${assignmentId}`);
}

export async function deleteQuestion(questionId: number, assignmentId: number) {
  const { courseId } = await requireAuthorOfAssignment(assignmentId);
  await (prisma.assignmentQuestion as any).delete({ where: { id: questionId } });
  revalidatePath(`/teach/${courseId}/assignments/${assignmentId}`);
}

export async function reorderQuestion(questionId: number, assignmentId: number, direction: "up" | "down") {
  const { courseId } = await requireAuthorOfAssignment(assignmentId);

  const questions = await (prisma.assignmentQuestion as any).findMany({
    where: { assignmentId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const idx = questions.findIndex((q: any) => q.id === questionId);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= questions.length) return;

  const current = questions[idx];
  const swap = questions[swapIdx];

  await (prisma.assignmentQuestion as any).update({ where: { id: current.id }, data: { order: swap.order } });
  await (prisma.assignmentQuestion as any).update({ where: { id: swap.id }, data: { order: current.order } });

  revalidatePath(`/teach/${courseId}/assignments/${assignmentId}`);
}
