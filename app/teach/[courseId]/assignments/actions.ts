"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { deleteByPrefix } from "@/lib/minio";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const AssignmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  maxFileSizeMB: z.coerce.number().min(1).max(500).default(10),
  allowedTypes: z.string().default("application/pdf,image/jpeg,image/png"),
  dueDate: z.string().optional(),
});

async function requireCourseAuthor(courseId: number) {
  const user = await requireAuth();
  if (!canAuthor(user.role)) throw new Error("Forbidden");
  if (user.role !== "ADMIN") {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { authorId: true } });
    if (course?.authorId !== user.id) throw new Error("Forbidden: not course author");
  }
  return user;
}

export async function createAssignment(lessonId: number, courseId: number, formData: FormData) {
  await requireCourseAuthor(courseId);

  const data = AssignmentSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    maxFileSizeMB: formData.get("maxFileSizeMB") || 10,
    allowedTypes: formData.get("allowedTypes") || "application/pdf,image/jpeg,image/png",
    dueDate: formData.get("dueDate") || undefined,
  });

  await prisma.assignment.create({
    data: {
      lessonId,
      title: data.title,
      description: data.description,
      maxFileSize: data.maxFileSizeMB * 1024 * 1024,
      allowedTypes: data.allowedTypes.split(",").map((t) => t.trim()),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  revalidatePath(`/teach/${courseId}`);
  redirect(`/teach/${courseId}/assignments`);
}

export async function createCourseAssignmentFromTeach(courseId: number, formData: FormData) {
  await requireCourseAuthor(courseId);

  const data = AssignmentSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    maxFileSizeMB: formData.get("maxFileSizeMB") || 10,
    allowedTypes: formData.get("allowedTypes") || "application/pdf,image/jpeg,image/png",
    dueDate: formData.get("dueDate") || undefined,
  });

  await prisma.assignment.create({
    data: {
      courseId,
      lessonId: null,
      title: data.title,
      description: data.description,
      maxFileSize: data.maxFileSizeMB * 1024 * 1024,
      allowedTypes: data.allowedTypes.split(",").map((t) => t.trim()),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  revalidatePath(`/teach/${courseId}`);
  redirect(`/teach/${courseId}/assignments`);
}

export async function updateAssignment(id: number, courseId: number, formData: FormData) {
  await requireCourseAuthor(courseId);

  const data = AssignmentSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    maxFileSizeMB: formData.get("maxFileSizeMB") || 10,
    allowedTypes: formData.get("allowedTypes") || "application/pdf,image/jpeg,image/png",
    dueDate: formData.get("dueDate") || undefined,
  });

  await prisma.assignment.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      maxFileSize: data.maxFileSizeMB * 1024 * 1024,
      allowedTypes: data.allowedTypes.split(",").map((t) => t.trim()),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });

  revalidatePath(`/teach/${courseId}/assignments`);
}

export async function deleteAssignment(id: number, courseId: number, force = false) {
  const user = await requireCourseAuthor(courseId);

  const submissionCount = await prisma.submission.count({ where: { assignmentId: id } });
  if (submissionCount > 0 && !force) {
    throw new Error(`Assignment has ${submissionCount} submissions. Use force=true (ADMIN only) to delete.`);
  }
  if (submissionCount > 0 && force && user.role !== "ADMIN") {
    throw new Error("Only ADMIN can force-delete an assignment with submissions.");
  }

  await prisma.assignment.delete({ where: { id } });
  await deleteByPrefix(`assignments/${id}/`).catch(() => {});
  revalidatePath(`/teach/${courseId}/assignments`);
}
