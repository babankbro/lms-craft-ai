import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Quiz engine integration", () => {
  let prisma: PrismaClient;
  let quizId: number;
  let q1Id: number;
  let correctChoiceId: number;
  let wrongChoiceId: number;
  let studentUserId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const student = await prisma.user.findFirst({ where: { role: "STUDENT" } });
    studentUserId = student!.id;

    const quiz = await prisma.quiz.create({
      data: {
        title: "Test Quiz",
        type: "QUIZ",
        passingScore: 60,
        maxAttempts: 3,
        questions: {
          create: [
            {
              questionText: "What is 2+2?",
              points: 1,
              order: 1,
              choices: {
                create: [
                  { choiceText: "3", isCorrect: false },
                  { choiceText: "4", isCorrect: true },
                  { choiceText: "5", isCorrect: false },
                ],
              },
            },
          ],
        },
      },
      include: {
        questions: { include: { choices: true } },
      },
    });
    quizId = quiz.id;
    q1Id = quiz.questions[0].id;
    correctChoiceId = quiz.questions[0].choices.find((c) => c.isCorrect)!.id;
    wrongChoiceId = quiz.questions[0].choices.find((c) => !c.isCorrect)!.id;
  });

  afterAll(async () => {
    await prisma.quizAnswer.deleteMany({});
    await prisma.quizAttempt.deleteMany({});
    await prisma.quizChoice.deleteMany({});
    await prisma.quizQuestion.deleteMany({});
    await prisma.quiz.deleteMany({ where: { id: quizId } });
    await prisma.$disconnect();
  });

  it("creates quiz attempt and scores correctly on correct answer", async () => {
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: studentUserId,
        attemptNo: 1,
        answers: {
          create: [{ questionId: q1Id, choiceId: correctChoiceId }],
        },
      },
      include: { answers: { include: { choice: true, question: true } } },
    });

    let score = 0;
    let total = 0;
    for (const ans of attempt.answers) {
      total += ans.question.points;
      if (ans.choice.isCorrect) score += ans.question.points;
    }

    const pct = (score / total) * 100;
    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { score, totalPoints: total, percentage: pct, isPassed: pct >= 60, isSubmitted: true },
    });

    const updated = await prisma.quizAttempt.findUnique({ where: { id: attempt.id } });
    expect(updated?.score).toBe(1);
    expect(updated?.isPassed).toBe(true);
  });

  it("enforces unique attempt per (quiz, student, attemptNo)", async () => {
    await expect(
      prisma.quizAttempt.create({
        data: { quizId, studentId: studentUserId, attemptNo: 1 },
      })
    ).rejects.toThrow();
  });

  it("allows multiple attempts with different attemptNo", async () => {
    const attempt2 = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: studentUserId,
        attemptNo: 2,
        answers: {
          create: [{ questionId: q1Id, choiceId: wrongChoiceId }],
        },
      },
      include: { answers: { include: { choice: true, question: true } } },
    });

    let score = 0;
    for (const ans of attempt2.answers) {
      if (ans.choice.isCorrect) score += ans.question.points;
    }
    expect(score).toBe(0);
  });
});
