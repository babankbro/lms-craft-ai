import { describe, it, expect } from "vitest";

interface CompletionInput {
  totalLessons: number;
  completedLessons: number;
  quizResults: { quizId: number; hasPassed: boolean }[];
}

function checkCompletion(input: CompletionInput) {
  const allLessonsComplete =
    input.completedLessons >= input.totalLessons && input.totalLessons > 0;
  const allQuizzesPassed = input.quizResults.length === 0 || input.quizResults.every((q) => q.hasPassed);
  const progress =
    input.totalLessons > 0
      ? Math.round((input.completedLessons / input.totalLessons) * 100)
      : 0;

  return {
    allLessonsComplete,
    allQuizzesPassed,
    isComplete: allLessonsComplete && allQuizzesPassed,
    progress,
  };
}

describe("Course completion check", () => {
  it("returns complete when all lessons done and quizzes passed", () => {
    const result = checkCompletion({
      totalLessons: 5,
      completedLessons: 5,
      quizResults: [
        { quizId: 1, hasPassed: true },
        { quizId: 2, hasPassed: true },
      ],
    });
    expect(result.isComplete).toBe(true);
    expect(result.progress).toBe(100);
  });

  it("returns incomplete when lessons remaining", () => {
    const result = checkCompletion({
      totalLessons: 5,
      completedLessons: 3,
      quizResults: [{ quizId: 1, hasPassed: true }],
    });
    expect(result.isComplete).toBe(false);
    expect(result.progress).toBe(60);
  });

  it("returns incomplete when quiz not passed", () => {
    const result = checkCompletion({
      totalLessons: 5,
      completedLessons: 5,
      quizResults: [
        { quizId: 1, hasPassed: true },
        { quizId: 2, hasPassed: false },
      ],
    });
    expect(result.isComplete).toBe(false);
    expect(result.allLessonsComplete).toBe(true);
    expect(result.allQuizzesPassed).toBe(false);
  });

  it("handles course with no lessons", () => {
    const result = checkCompletion({
      totalLessons: 0,
      completedLessons: 0,
      quizResults: [],
    });
    expect(result.isComplete).toBe(false);
    expect(result.progress).toBe(0);
  });
});
