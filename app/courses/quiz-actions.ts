"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { calculateQuizScore } from "@/lib/scoring";
import { maybeIssueCertificate } from "@/lib/certificate";
import { revalidatePath } from "next/cache";

export async function startQuizAttempt(quizId: number) {
  const user = await requireAuth();

  // Check max attempts
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new Error("Quiz not found");

  const attemptCount = await prisma.quizAttempt.count({
    where: { quizId, studentId: user.id },
  });

  if (quiz.maxAttempts > 0 && attemptCount >= quiz.maxAttempts) {
    throw new Error("Max attempts reached");
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentId: user.id,
      attemptNo: attemptCount + 1,
    },
  });

  return attempt.id;
}

export async function submitQuizAttempt(
  attemptId: number,
  answers: { questionId: number; choiceId: number }[]
) {
  const user = await requireAuth();

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: true },
  });

  if (!attempt || attempt.studentId !== user.id) {
    throw new Error("Invalid attempt");
  }

  if (attempt.isSubmitted) {
    throw new Error("Already submitted");
  }

  // Save answers
  await prisma.quizAnswer.createMany({
    data: answers.map((a) => ({
      attemptId,
      questionId: a.questionId,
      choiceId: a.choiceId,
    })),
  });

  // Calculate score
  const result = await calculateQuizScore(attemptId, attempt.quiz.passingScore);

  // Update attempt
  await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      score: result.score,
      totalPoints: result.totalPoints,
      percentage: result.percentage,
      isPassed: result.isPassed,
      isSubmitted: true,
      submittedAt: new Date(),
    },
  });

  // Auto-issue certificate if this is the course Post-Test and it was just passed
  if (result.isPassed && attempt.quiz.courseId) {
    const courseForCert = await prisma.course.findUnique({
      where: { id: attempt.quiz.courseId },
      select: { postTestQuizId: true },
    });
    if (courseForCert?.postTestQuizId === attempt.quiz.id) {
      await maybeIssueCertificate(user.id, attempt.quiz.courseId).catch(() => {});
    }
  }

  revalidatePath("/courses");
  return result;
}
