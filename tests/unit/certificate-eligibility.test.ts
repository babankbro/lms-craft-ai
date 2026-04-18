import { describe, it, expect } from "vitest";

type QuizType = "PRE_TEST" | "POST_TEST" | "QUIZ";
type Quiz = { id: number; type: QuizType };
type CourseState = {
  lessons: { id: number }[];
  quizzes: Quiz[];
  completedLessonIds: Set<number>;
  passedQuizIds: Set<number>;
};

function checkEligibility(state: CourseState): { eligible: boolean; reason?: string } {
  const { lessons, quizzes, completedLessonIds, passedQuizIds } = state;

  // All lessons must be completed
  for (const lesson of lessons) {
    if (!completedLessonIds.has(lesson.id)) {
      return { eligible: false, reason: `Lesson ${lesson.id} not completed` };
    }
  }

  // POST_TEST must have a passing attempt (if any)
  for (const quiz of quizzes.filter((q) => q.type === "POST_TEST")) {
    if (!passedQuizIds.has(quiz.id)) {
      return { eligible: false, reason: `POST_TEST ${quiz.id} not passed` };
    }
  }

  // All QUIZ-typed quizzes must have a passing attempt
  for (const quiz of quizzes.filter((q) => q.type === "QUIZ")) {
    if (!passedQuizIds.has(quiz.id)) {
      return { eligible: false, reason: `Quiz ${quiz.id} not passed` };
    }
  }

  // PRE_TEST is NOT required
  return { eligible: true };
}

describe("certificate eligibility", () => {
  const lessons = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const quizzes: Quiz[] = [
    { id: 10, type: "PRE_TEST" },
    { id: 11, type: "POST_TEST" },
    { id: 12, type: "QUIZ" },
  ];

  it("eligible when all lessons done + POST_TEST + QUIZ passed", () => {
    const state: CourseState = {
      lessons,
      quizzes,
      completedLessonIds: new Set([1, 2, 3]),
      passedQuizIds: new Set([11, 12]), // PRE_TEST 10 not required
    };
    expect(checkEligibility(state).eligible).toBe(true);
  });

  it("not eligible when a lesson is missing", () => {
    const state: CourseState = {
      lessons,
      quizzes,
      completedLessonIds: new Set([1, 2]), // missing 3
      passedQuizIds: new Set([11, 12]),
    };
    const result = checkEligibility(state);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("Lesson 3");
  });

  it("not eligible when POST_TEST not passed", () => {
    const state: CourseState = {
      lessons,
      quizzes,
      completedLessonIds: new Set([1, 2, 3]),
      passedQuizIds: new Set([12]), // missing POST_TEST
    };
    const result = checkEligibility(state);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("POST_TEST");
  });

  it("not eligible when a QUIZ not passed", () => {
    const state: CourseState = {
      lessons,
      quizzes,
      completedLessonIds: new Set([1, 2, 3]),
      passedQuizIds: new Set([11]), // missing QUIZ 12
    };
    const result = checkEligibility(state);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("Quiz 12");
  });

  it("PRE_TEST alone does NOT satisfy requirements", () => {
    const state: CourseState = {
      lessons,
      quizzes,
      completedLessonIds: new Set([1, 2, 3]),
      passedQuizIds: new Set([10]), // only PRE_TEST
    };
    expect(checkEligibility(state).eligible).toBe(false);
  });

  it("eligible with no quizzes if all lessons done", () => {
    const state: CourseState = {
      lessons,
      quizzes: [],
      completedLessonIds: new Set([1, 2, 3]),
      passedQuizIds: new Set(),
    };
    expect(checkEligibility(state).eligible).toBe(true);
  });

  it("eligible with no lessons and no quizzes (empty course)", () => {
    const state: CourseState = {
      lessons: [],
      quizzes: [],
      completedLessonIds: new Set(),
      passedQuizIds: new Set(),
    };
    expect(checkEligibility(state).eligible).toBe(true);
  });
});
