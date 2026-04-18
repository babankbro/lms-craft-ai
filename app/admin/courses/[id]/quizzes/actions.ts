"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const QuizSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["PRE_TEST", "POST_TEST", "QUIZ"]),
  passingScore: z.coerce.number().min(0).max(100).default(60),
  maxAttempts: z.coerce.number().int().min(0).default(3),
});

export async function createQuiz(courseId: number, formData: FormData) {
  await requireRole("INSTRUCTOR", "ADMIN");

  const data = QuizSchema.parse({
    title: formData.get("title"),
    type: formData.get("type"),
    passingScore: formData.get("passingScore"),
    maxAttempts: formData.get("maxAttempts"),
  });

  const quiz = await prisma.quiz.create({
    data: {
      title: data.title,
      type: data.type,
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
    },
  });

  // Attach quiz to each selected lesson
  const lessonIds = formData.getAll("lessonIds").map(Number);
  for (let i = 0; i < lessonIds.length; i++) {
    await prisma.lessonQuiz.create({
      data: { lessonId: lessonIds[i], quizId: quiz.id, order: i },
    });
  }

  revalidatePath(`/admin/courses/${courseId}`);
  return quiz.id;
}

export async function addQuestion(quizId: number, formData: FormData) {
  await requireRole("INSTRUCTOR", "ADMIN");

  const question = await prisma.quizQuestion.create({
    data: {
      quizId,
      questionText: formData.get("questionText") as string,
      points: parseFloat(formData.get("points") as string) || 1,
      order: parseInt(formData.get("order") as string) || 1,
    },
  });

  // Create choices
  const choices = JSON.parse(formData.get("choices") as string) as {
    text: string;
    isCorrect: boolean;
  }[];

  for (const choice of choices) {
    await prisma.quizChoice.create({
      data: {
        questionId: question.id,
        choiceText: choice.text,
        isCorrect: choice.isCorrect,
      },
    });
  }

  revalidatePath(`/admin/courses`);
  return question.id;
}

export async function deleteQuiz(quizId: number) {
  await requireRole("INSTRUCTOR", "ADMIN");
  await prisma.quiz.delete({ where: { id: quizId } });
  revalidatePath("/admin/courses");
}
