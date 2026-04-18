import { prisma } from "./prisma";

export interface QuizResult {
  score: number;
  totalPoints: number;
  percentage: number;
  isPassed: boolean;
  details: {
    questionId: number;
    isCorrect: boolean;
    earnedPoints: number;
  }[];
}

export async function calculateQuizScore(
  attemptId: number,
  passingScore: number
): Promise<QuizResult> {
  const answers = await prisma.quizAnswer.findMany({
    where: { attemptId },
    include: {
      question: true,
      choice: true,
    },
  });

  let score = 0;
  let totalPoints = 0;
  const details: QuizResult["details"] = [];

  for (const answer of answers) {
    totalPoints += answer.question.points;
    const isCorrect = answer.choice.isCorrect;
    const earned = isCorrect ? answer.question.points : 0;
    score += earned;

    details.push({
      questionId: answer.questionId,
      isCorrect,
      earnedPoints: earned,
    });
  }

  const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

  return {
    score,
    totalPoints,
    percentage: Math.round(percentage * 100) / 100,
    isPassed: percentage >= passingScore,
    details,
  };
}

export async function checkCourseCompletion(
  userId: string,
  courseId: number
): Promise<{
  allLessonsComplete: boolean;
  allQuizzesPassed: boolean;
  isComplete: boolean;
  progress: number;
}> {
  const totalLessons = await prisma.lesson.count({ where: { courseId } });
  const completedLessons = await prisma.lessonProgress.count({
    where: { userId, lesson: { courseId }, isCompleted: true },
  });
  const allLessonsComplete = completedLessons >= totalLessons && totalLessons > 0;

  const lessonQuizzes = await prisma.lessonQuiz.findMany({
    where: { lesson: { courseId } },
    select: { quizId: true },
  });

  let allQuizzesPassed = true;
  if (lessonQuizzes.length === 0) {
    allQuizzesPassed = true;
  } else {
    for (const lq of lessonQuizzes) {
      const passingAttempt = await prisma.quizAttempt.findFirst({
        where: { quizId: lq.quizId, studentId: userId, isPassed: true },
      });
      if (!passingAttempt) {
        allQuizzesPassed = false;
        break;
      }
    }
  }

  const progress = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  return {
    allLessonsComplete,
    allQuizzesPassed,
    isComplete: allLessonsComplete && allQuizzesPassed,
    progress,
  };
}
