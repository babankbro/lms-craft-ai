"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { slugify, uniqueSlug } from "@/lib/slug";
import { CourseCreateSchema, CourseUpdateSchema } from "@/lib/validators/course";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCourse(formData: FormData) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");

  const data = CourseCreateSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  const base = slugify(data.title);
  const slug = await uniqueSlug(base);

  const course = await prisma.course.create({
    data: { title: data.title, description: data.description, slug, authorId: user.id },
  });

  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${course.id}`);
}

export async function updateCourse(id: number, formData: FormData) {
  await requireRole("INSTRUCTOR", "ADMIN");

  const data = CourseUpdateSchema.parse({
    id,
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    isPublished: formData.get("isPublished") === "true",
  });

  await prisma.course.update({
    where: { id: data.id },
    data: {
      title: data.title,
      description: data.description ?? null,
      isPublished: data.isPublished,
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/courses`);
}

export async function togglePublish(id: number, isPublished: boolean) {
  await requireRole("INSTRUCTOR", "ADMIN");

  if (isPublished) {
    const lessonCount = await prisma.lesson.count({ where: { courseId: id } });
    if (lessonCount === 0) {
      throw new Error("CANNOT_PUBLISH_EMPTY");
    }
  }

  await prisma.course.update({
    where: { id },
    data: { isPublished },
  });

  revalidatePath("/admin/courses");
  revalidatePath(`/courses`);
}

export async function deleteCourse(id: number) {
  await requireRole("INSTRUCTOR", "ADMIN");
  await prisma.course.delete({ where: { id } });
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

export async function setCoursePreTest(courseId: number, quizId: number | null) {
  await requireRole("INSTRUCTOR", "ADMIN");
  await (prisma.course.update as any)({
    where: { id: courseId },
    data: { preTestQuizId: quizId },
  });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function setCoursePostTest(courseId: number, quizId: number | null) {
  await requireRole("INSTRUCTOR", "ADMIN");
  await (prisma.course.update as any)({
    where: { id: courseId },
    data: { postTestQuizId: quizId },
  });
  revalidatePath(`/admin/courses/${courseId}`);
}
