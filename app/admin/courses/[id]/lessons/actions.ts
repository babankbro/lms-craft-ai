"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const LessonSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(""),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
  estimatedMinutes: z.coerce.number().int().min(0).optional(),
  order: z.coerce.number().int().min(0),
});

export async function createLesson(courseId: number, formData: FormData) {
  await requireRole("INSTRUCTOR", "ADMIN");

  const data = LessonSchema.parse({
    title: formData.get("title"),
    content: formData.get("content") || "",
    youtubeUrl: formData.get("youtubeUrl") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes") || undefined,
    order: formData.get("order"),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.lesson.create as any)({
    data: {
      courseId,
      title: data.title,
      content: data.content,
      youtubeUrl: data.youtubeUrl || null,
      estimatedMinutes: data.estimatedMinutes ?? null,
      order: data.order,
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function updateLesson(lessonId: number, formData: FormData) {
  await requireRole("INSTRUCTOR", "ADMIN");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lesson = await (prisma.lesson.update as any)({
    where: { id: lessonId },
    data: {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      youtubeUrl: (formData.get("youtubeUrl") as string) || null,
      estimatedMinutes: formData.get("estimatedMinutes")
        ? parseInt(formData.get("estimatedMinutes") as string)
        : null,
      order: parseInt(formData.get("order") as string),
    },
  });

  revalidatePath(`/admin/courses/${lesson.courseId}`);
}

export async function deleteLesson(lessonId: number) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const lesson = await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath(`/admin/courses/${lesson.courseId}`);
}
