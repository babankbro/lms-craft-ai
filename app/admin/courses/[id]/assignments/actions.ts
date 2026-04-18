"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCourseAssignment(courseId: number, formData: FormData) {
  await requireRole("ADMIN");

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const dueDateRaw = formData.get("dueDate") as string | null;
  const maxFileSizeMB = parseFloat((formData.get("maxFileSizeMB") as string) ?? "10");
  const allowedTypesRaw = (formData.get("allowedTypes") as string) ?? "";
  const questionsRaw = (formData.get("questions") as string) ?? "[]";

  if (!title) throw new Error("Title is required");

  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const allowedTypes = allowedTypesRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const maxFileSize = Math.round(maxFileSizeMB * 1024 * 1024);

  let questions: { prompt: string; responseType: string; required: boolean }[] = [];
  try {
    questions = JSON.parse(questionsRaw);
  } catch {
    questions = [];
  }

  await prisma.assignment.create({
    data: {
      courseId,
      lessonId: null,
      title,
      description,
      dueDate,
      maxFileSize,
      allowedTypes: allowedTypes.length > 0 ? allowedTypes : undefined,
      questions: {
        create: questions.map((q, i) => ({
          prompt: q.prompt,
          responseType: (q.responseType as "TEXT" | "FILE" | "BOTH") ?? "TEXT",
          required: q.required ?? true,
          order: i + 1,
        })),
      },
    },
  });

  revalidatePath(`/admin/courses/${courseId}/assignments`);
  redirect(`/admin/courses/${courseId}/assignments`);
}

export async function deleteCourseAssignment(assignmentId: number, courseId: number) {
  await requireRole("ADMIN");

  const existing = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { courseId: true, _count: { select: { submissions: true } } },
  });

  if (!existing) throw new Error("Assignment not found");
  if (existing.courseId !== courseId) throw new Error("Forbidden");
  if (existing._count.submissions > 0)
    throw new Error("Cannot delete: assignment has submissions");

  await prisma.assignment.delete({ where: { id: assignmentId } });

  revalidatePath(`/admin/courses/${courseId}/assignments`);
}
