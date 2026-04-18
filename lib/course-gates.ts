import { prisma } from "@/lib/prisma";

export async function isQuizPassed(userId: string, quizId: number): Promise<boolean> {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { quizId, studentId: userId, isPassed: true },
  });
  return !!attempt;
}

export async function isQuizSubmitted(userId: string, quizId: number): Promise<boolean> {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { quizId, studentId: userId, isSubmitted: true },
  });
  return !!attempt;
}

/**
 * A section is "complete" when:
 * - All its lessons are marked completed, AND
 * - All AFTER-placement gate quizzes are passed (exit gates).
 * BEFORE-placement quizzes do NOT block section completion.
 */
export async function isSectionComplete(userId: string, sectionId: number): Promise<boolean> {
  const section = await prisma.courseSection.findUnique({
    where: { id: sectionId },
    include: {
      lessons: { select: { id: true } },
      sectionQuizzes: {
        where: { isGate: true, placement: "AFTER" },
        select: { quizId: true },
      },
    },
  });
  if (!section) return false;

  for (const lesson of section.lessons) {
    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
    });
    if (!progress?.isCompleted) return false;
  }

  for (const sq of section.sectionQuizzes) {
    if (!(await isQuizPassed(userId, sq.quizId))) return false;
  }

  return true;
}

/**
 * Whether a student may enter a section (view its lessons).
 * Blocked if the section has a BEFORE-placement gate quiz that hasn't been submitted yet.
 */
export async function canEnterSection(userId: string, sectionId: number): Promise<boolean> {
  const sectionQuizzes = await prisma.sectionQuiz.findMany({
    where: { sectionId, isGate: true, placement: "BEFORE" },
    select: { quizId: true },
  });
  for (const sq of sectionQuizzes) {
    if (!(await isQuizSubmitted(userId, sq.quizId))) return false;
  }
  return true;
}

export async function canAccessLesson(userId: string, lessonId: number): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      course: {
        include: {
          preTestQuiz: { select: { id: true } },
        },
      },
      section: { select: { id: true, order: true } },
    },
  });
  if (!lesson) return false;
  const courseId = lesson.courseId;

  // 1. Must have APPROVED enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment || enrollment.status !== "APPROVED") return false;

  // 2. Course Pre-Test gate: must have submitted (not necessarily passed — diagnostic)
  const preTestId = lesson.course.preTestQuiz?.id;
  if (preTestId) {
    if (!(await isQuizSubmitted(userId, preTestId))) return false;
  }

  if (lesson.section) {
    // 3. BEFORE gate on THIS section: must have submitted it to enter
    if (!(await canEnterSection(userId, lesson.section.id))) return false;

    // 4. All PREVIOUS sections must be complete (lessons done + AFTER gates passed)
    const prevSections = await prisma.courseSection.findMany({
      where: { courseId, order: { lt: lesson.section.order } },
      select: { id: true },
    });
    for (const prev of prevSections) {
      if (!(await isSectionComplete(userId, prev.id))) return false;
    }
  }

  return true;
}

export async function canAccessPostTest(userId: string, courseId: number): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment || enrollment.status !== "APPROVED") return false;

  const sections = await prisma.courseSection.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  for (const section of sections) {
    if (!(await isSectionComplete(userId, section.id))) return false;
  }
  return true;
}
