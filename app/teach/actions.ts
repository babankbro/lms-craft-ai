"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { slugify, uniqueSlug } from "@/lib/slug";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const CourseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  slug: z.string().regex(/^[a-z0-9\u0E00-\u0E7F-]+$/).optional(),
});

const LessonSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(""),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
  estimatedMinutes: z.coerce.number().int().min(0).optional(),
  order: z.coerce.number().int().min(0),
});

async function requireCourseAuthor(courseId: number) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } });
  if (course.authorId !== user.id && user.role !== "ADMIN") {
    redirect("/teach");
  }
  return { user, course };
}

// ─── Course ──────────────────────────────────────────────────────────────────

export async function createCourse(formData: FormData) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");

  const data = CourseSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    level: formData.get("level") || undefined,
    slug: formData.get("slug") || undefined,
  });

  const base = data.slug || slugify(data.title as string);
  const slug = await uniqueSlug(base);

  const course = await prisma.course.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      level: data.level,
      slug,
      authorId: user.id,
    },
  });

  revalidatePath("/teach");
  redirect(`/teach/${course.id}`);
}

export async function updateCourse(courseId: number, formData: FormData) {
  await requireCourseAuthor(courseId);

  const data = CourseSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    level: formData.get("level") || undefined,
  });

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      level: data.level ?? null,
    },
  });

  revalidatePath(`/teach/${courseId}`);
  revalidatePath("/courses");
}

export async function publishCourse(courseId: number, isPublished: boolean) {
  await requireCourseAuthor(courseId);

  if (isPublished) {
    const lessonCount = await prisma.lesson.count({ where: { courseId } });
    if (lessonCount === 0) throw new Error("CANNOT_PUBLISH_EMPTY");
  }

  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } }) as any;
  const now = new Date();

  await (prisma.course.update as any)({
    where: { id: courseId },
    data: {
      isPublished,
      // Only set publishedAt on the very first publish; never clear it
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- publishedAt added in schema; regen prisma client to resolve
      publishedAt: isPublished && !course.publishedAt ? now : course.publishedAt,
    },
  });

  revalidatePath(`/teach/${courseId}`);
  revalidatePath("/courses");
}

export async function deleteCourse(courseId: number) {
  await requireCourseAuthor(courseId);
  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/teach");
  redirect("/teach");
}

export async function updateCoverImage(courseId: number, fileKey: string) {
  await requireCourseAuthor(courseId);
  await prisma.course.update({
    where: { id: courseId },
    data: { coverImageKey: fileKey },
  });
  revalidatePath(`/teach/${courseId}`);
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export async function createLesson(courseId: number, formData: FormData) {
  await requireCourseAuthor(courseId);

  const lastLesson = await prisma.lesson.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
  });
  const nextOrder = lastLesson ? lastLesson.order + 1 : 1;

  const data = LessonSchema.parse({
    title: formData.get("title"),
    content: formData.get("content") || "",
    youtubeUrl: formData.get("youtubeUrl") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes") || undefined,
    order: formData.get("order") || nextOrder,
  });

  const lesson = await prisma.lesson.create({
    data: {
      courseId,
      title: data.title,
      content: data.content,
      youtubeUrl: data.youtubeUrl || null,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- estimatedMinutes added in schema; regen prisma client to resolve
      estimatedMinutes: data.estimatedMinutes ?? null,
      order: data.order,
    },
  });

  revalidatePath(`/teach/${courseId}`);
  redirect(`/teach/${courseId}/lessons/${lesson.id}`);
}

export async function updateLesson(lessonId: number, formData: FormData) {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  await requireCourseAuthor(lesson.courseId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.lesson.update as any)({
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

  revalidatePath(`/teach/${lesson.courseId}`);
  revalidatePath(`/courses`);
}

export async function deleteLesson(lessonId: number) {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  await requireCourseAuthor(lesson.courseId);
  await prisma.lesson.delete({ where: { id: lessonId } });
  revalidatePath(`/teach/${lesson.courseId}`);
  redirect(`/teach/${lesson.courseId}`);
}

export async function reorderLessons(courseId: number, orderedIds: number[]) {
  await requireCourseAuthor(courseId);

  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.lesson.update({ where: { id }, data: { order: idx + 1 } })
    )
  );

  revalidatePath(`/teach/${courseId}`);
}

export async function deleteLessonAttachment(attachmentId: number) {
  const attachment = await prisma.lessonAttachment.findUniqueOrThrow({
    where: { id: attachmentId },
    include: { lesson: true },
  });
  await requireCourseAuthor(attachment.lesson.courseId);
  await prisma.lessonAttachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/teach/${attachment.lesson.courseId}/lessons/${attachment.lessonId}`);
}

// ─── Course Pre/Post Test binding ────────────────────────────────────────────

export async function setCoursePreTest(courseId: number, quizId: number | null) {
  await requireCourseAuthor(courseId);
  await (prisma.course.update as any)({
    where: { id: courseId },
    data: { preTestQuizId: quizId },
  });
  revalidatePath(`/teach/${courseId}`);
}

export async function setCoursePostTest(courseId: number, quizId: number | null) {
  await requireCourseAuthor(courseId);
  await (prisma.course.update as any)({
    where: { id: courseId },
    data: { postTestQuizId: quizId },
  });
  revalidatePath(`/teach/${courseId}`);
}

// ─── Quizzes ─────────────────────────────────────────────────────────────────

const QuizSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["PRE_TEST", "POST_TEST", "QUIZ"]).default("QUIZ"),
  maxAttempts: z.coerce.number().int().min(0).default(0),
  passingScore: z.coerce.number().min(0).max(100).default(60),
});

export async function createQuiz(courseId: number, formData: FormData) {
  await requireCourseAuthor(courseId);

  const data = QuizSchema.parse({
    title: formData.get("title"),
    type: formData.get("type") || "QUIZ",
    maxAttempts: formData.get("maxAttempts") || 0,
    passingScore: formData.get("passingScore") || 60,
  });

  const quiz = await prisma.quiz.create({
    data: { ...data, courseId },
  });

  revalidatePath(`/teach/${courseId}/quizzes`);
  redirect(`/teach/${courseId}/quizzes/${quiz.id}`);
}

export async function updateQuiz(quizId: number, formData: FormData) {
  const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: quizId } });
  if (quiz.courseId) await requireCourseAuthor(quiz.courseId);

  const data = QuizSchema.parse({
    title: formData.get("title"),
    type: formData.get("type") || quiz.type,
    maxAttempts: formData.get("maxAttempts") ?? quiz.maxAttempts,
    passingScore: formData.get("passingScore") ?? quiz.passingScore,
  });

  await prisma.quiz.update({ where: { id: quizId }, data });
  revalidatePath(`/teach/${quiz.courseId}/quizzes/${quizId}`);
}

export async function deleteQuiz(quizId: number) {
  const attemptsCount = await prisma.quizAttempt.count({ where: { quizId } });
  if (attemptsCount > 0) throw new Error("QUIZ_HAS_ATTEMPTS");

  const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: quizId } });
  if (quiz.courseId) await requireCourseAuthor(quiz.courseId);
  await prisma.quiz.delete({ where: { id: quizId } });
  revalidatePath(`/teach/${quiz.courseId}/quizzes`);
  redirect(`/teach/${quiz.courseId}/quizzes`);
}

// ─── Questions ───────────────────────────────────────────────────────────────

export async function addQuestion(quizId: number, formData: FormData) {
  const quiz = await prisma.quiz.findUniqueOrThrow({ where: { id: quizId } });
  if (quiz.courseId) await requireCourseAuthor(quiz.courseId);

  const lastQ = await prisma.quizQuestion.findFirst({
    where: { quizId },
    orderBy: { order: "desc" },
  });

  await prisma.quizQuestion.create({
    data: {
      quizId,
      questionText: formData.get("questionText") as string,
      points: parseFloat((formData.get("points") as string) || "1"),
      order: lastQ ? lastQ.order + 1 : 1,
    },
  });

  revalidatePath(`/teach/${quiz.courseId}/quizzes/${quizId}`);
}

export async function updateQuestion(questionId: number, formData: FormData) {
  await prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      questionText: formData.get("questionText") as string,
      points: parseFloat((formData.get("points") as string) || "1"),
    },
  });
}

export async function deleteQuestion(questionId: number) {
  await prisma.quizQuestion.delete({ where: { id: questionId } });
}

// ─── Choices ─────────────────────────────────────────────────────────────────

export async function addChoice(questionId: number, formData: FormData) {
  await prisma.quizChoice.create({
    data: {
      questionId,
      choiceText: formData.get("choiceText") as string,
      isCorrect: formData.get("isCorrect") === "true",
    },
  });
}

export async function updateChoice(choiceId: number, formData: FormData) {
  await prisma.quizChoice.update({
    where: { id: choiceId },
    data: {
      choiceText: formData.get("choiceText") as string,
      isCorrect: formData.get("isCorrect") === "true",
    },
  });
}

export async function deleteChoice(choiceId: number) {
  await prisma.quizChoice.delete({ where: { id: choiceId } });
}

// ─── Quiz-Lesson linking ──────────────────────────────────────────────────────

export async function attachQuizToLesson(quizId: number, lessonId: number) {
  await prisma.lessonQuiz.upsert({
    where: { lessonId_quizId: { lessonId, quizId } },
    create: { lessonId, quizId },
    update: {},
  });
}

export async function detachQuizFromLesson(quizId: number, lessonId: number) {
  await prisma.lessonQuiz.delete({
    where: { lessonId_quizId: { lessonId, quizId } },
  });
}
