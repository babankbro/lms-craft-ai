"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { LessonCreateSchema } from "@/lib/validators/course";
import { revalidatePath } from "next/cache";
import { s3Client, BUCKET_NAME } from "@/lib/minio";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function createLesson(courseId: number, formData: FormData) {
  await requireRole("INSTRUCTOR", "ADMIN");

  const data = LessonCreateSchema.parse({
    courseId,
    title: formData.get("title"),
    content: formData.get("content") || "",
    youtubeUrl: formData.get("youtubeUrl") || undefined,
    order: formData.get("order") ? parseInt(formData.get("order") as string) : undefined,
  });

  const order = data.order ?? ((await prisma.lesson.aggregate({ where: { courseId }, _max: { order: true } }))._max.order ?? 0) + 10;

  await prisma.lesson.create({
    data: {
      courseId,
      title: data.title,
      content: data.content,
      youtubeUrl: data.youtubeUrl || null,
      order,
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function updateLesson(lessonId: number, formData: FormData) {
  await requireRole("INSTRUCTOR", "ADMIN");

  const sectionRaw = formData.get("sectionId") as string | null;
  const sectionId = sectionRaw && sectionRaw !== "" && sectionRaw !== "none"
    ? parseInt(sectionRaw, 10) || null
    : null;

  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      youtubeUrl: (formData.get("youtubeUrl") as string) || null,
      order: parseInt(formData.get("order") as string),
      sectionId,
    },
  });

  revalidatePath(`/admin/courses/${lesson.courseId}`);
}

export async function reorderLessons(courseId: number, orderedIds: number[]) {
  await requireRole("INSTRUCTOR", "ADMIN");

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lesson.update({ where: { id }, data: { order: index * 10 } })
    )
  );

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteLesson(lessonId: number) {
  await requireRole("INSTRUCTOR", "ADMIN");
  const lesson = await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath(`/admin/courses/${lesson.courseId}`);
}

export async function addAttachment(meta: {
  lessonId: number;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}) {
  await requireRole("INSTRUCTOR", "ADMIN");

  await prisma.lessonAttachment.create({ data: meta });

  const lesson = await prisma.lesson.findUnique({
    where: { id: meta.lessonId },
    select: { courseId: true },
  });
  if (lesson) {
    revalidatePath(`/admin/courses/${lesson.courseId}`);
  }
}

export async function removeAttachment(attachmentId: number) {
  await requireRole("INSTRUCTOR", "ADMIN");

  const attachment = await prisma.lessonAttachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment) return;

  // Delete from MinIO
  try {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: attachment.fileKey })
    );
  } catch (e) {
    console.error("MinIO delete failed:", e);
  }

  await prisma.lessonAttachment.delete({ where: { id: attachmentId } });

  const lesson = await prisma.lesson.findUnique({
    where: { id: attachment.lessonId },
    select: { courseId: true },
  });
  if (lesson) {
    revalidatePath(`/admin/courses/${lesson.courseId}`);
  }
}
