import { prisma } from "./prisma";

export type ComponentScore = {
  score: number | null;  // null = no items in this category
  itemCount: number;     // total items (quizzes/assignments) in this category
  weight: number;        // configured weight 0–100
};

export type ScoreBreakdown = {
  lessonQuiz: ComponentScore;
  sectionQuiz: ComponentScore;
  lessonAssignment: ComponentScore;
  courseAssignment: ComponentScore;
  finalScore: number | null;
  weightsConfigured: boolean;
};

// ─── Pure helpers (also exported for tests) ───────────────────────────────────

export function averageScores(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function normalizeScore(
  score: number,
  assignmentMaxScore: number | null,
  submissionMaxScore: number | null
): number {
  const denom = assignmentMaxScore ?? submissionMaxScore ?? 100;
  if (denom <= 0) return 0;
  return Math.min(100, (score / denom) * 100);
}

export function computeWeightedFinal(
  components: { score: number | null; weight: number }[]
): number | null {
  const active = components.filter((c) => c.score !== null && c.weight > 0);
  const totalWeight = active.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return null;
  const weighted = active.reduce((s, c) => s + c.score! * c.weight, 0);
  return Math.round((weighted / totalWeight) * 100) / 100;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function getStudentCourseScore(
  userId: string,
  courseId: number
): Promise<ScoreBreakdown> {
  // Load or create config with defaults 25/25/25/25
  const config = await prisma.courseScoreConfig.upsert({
    where: { courseId },
    update: {},
    create: { courseId },
  });

  const weightsConfigured =
    config.lessonQuizWeight + config.sectionQuizWeight +
    config.lessonAssignmentWeight + config.courseAssignmentWeight > 0;

  // ── 1. Lesson post-tests (POST_TEST and QUIZ types linked to lessons) ────────
  const lessonQuizLinks = await prisma.lessonQuiz.findMany({
    where: {
      lesson: { courseId },
      quiz: { type: { in: ["POST_TEST", "QUIZ"] } },
    },
    select: { quizId: true },
  });

  const lessonQuizScores = await Promise.all(
    lessonQuizLinks.map(async ({ quizId }) => {
      const best = await prisma.quizAttempt.findFirst({
        where: { quizId, studentId: userId, isSubmitted: true },
        orderBy: { percentage: "desc" },
        select: { percentage: true },
      });
      return best?.percentage ?? null;
    })
  );

  // ── 2. Section post-tests (AFTER placement) ──────────────────────────────────
  const sectionQuizLinks = await prisma.sectionQuiz.findMany({
    where: { section: { courseId }, placement: "AFTER" },
    select: { quizId: true },
  });

  const sectionQuizScores = await Promise.all(
    sectionQuizLinks.map(async ({ quizId }) => {
      const best = await prisma.quizAttempt.findFirst({
        where: { quizId, studentId: userId, isSubmitted: true },
        orderBy: { percentage: "desc" },
        select: { percentage: true },
      });
      return best?.percentage ?? null;
    })
  );

  // ── 3. Lesson assignments ────────────────────────────────────────────────────
  const lessonAssignments = await prisma.assignment.findMany({
    where: { lessonId: { not: null }, lesson: { courseId } },
    select: { id: true, maxScore: true },
  });

  const lessonAssignmentScores = await Promise.all(
    lessonAssignments.map(async (a) => {
      const sub = await prisma.submission.findFirst({
        where: { assignmentId: a.id, studentId: userId, status: "APPROVED" },
        select: { score: true, maxScore: true },
        orderBy: { updatedAt: "desc" },
      });
      if (!sub || sub.score == null) return null;
      return normalizeScore(sub.score, a.maxScore, sub.maxScore);
    })
  );

  // ── 4. Course-level assignments ──────────────────────────────────────────────
  const courseAssignments = await prisma.assignment.findMany({
    where: { courseId, lessonId: null },
    select: { id: true, maxScore: true },
  });

  const courseAssignmentScores = await Promise.all(
    courseAssignments.map(async (a) => {
      const sub = await prisma.submission.findFirst({
        where: { assignmentId: a.id, studentId: userId, status: "APPROVED" },
        select: { score: true, maxScore: true },
        orderBy: { updatedAt: "desc" },
      });
      if (!sub || sub.score == null) return null;
      return normalizeScore(sub.score, a.maxScore, sub.maxScore);
    })
  );

  // ── Assemble breakdown ───────────────────────────────────────────────────────
  const lessonQuiz: ComponentScore = {
    score: averageScores(lessonQuizScores),
    itemCount: lessonQuizLinks.length,
    weight: config.lessonQuizWeight,
  };
  const sectionQuiz: ComponentScore = {
    score: averageScores(sectionQuizScores),
    itemCount: sectionQuizLinks.length,
    weight: config.sectionQuizWeight,
  };
  const lessonAssignment: ComponentScore = {
    score: averageScores(lessonAssignmentScores),
    itemCount: lessonAssignments.length,
    weight: config.lessonAssignmentWeight,
  };
  const courseAssignment: ComponentScore = {
    score: averageScores(courseAssignmentScores),
    itemCount: courseAssignments.length,
    weight: config.courseAssignmentWeight,
  };

  const finalScore = computeWeightedFinal([
    lessonQuiz,
    sectionQuiz,
    lessonAssignment,
    courseAssignment,
  ]);

  return {
    lessonQuiz,
    sectionQuiz,
    lessonAssignment,
    courseAssignment,
    finalScore,
    weightsConfigured,
  };
}
