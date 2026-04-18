import { describe, it, expect } from "vitest";

function calculatePercentage(score: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((score / total) * 100 * 100) / 100;
}

function isPassed(percentage: number, passingScore: number): boolean {
  return percentage >= passingScore;
}

function calculateScore(
  answers: { isCorrect: boolean; points: number }[]
): { score: number; totalPoints: number } {
  let score = 0;
  let totalPoints = 0;
  for (const a of answers) {
    totalPoints += a.points;
    if (a.isCorrect) score += a.points;
  }
  return { score, totalPoints };
}

describe("Quiz scoring", () => {
  it("calculates correct score", () => {
    const result = calculateScore([
      { isCorrect: true, points: 2 },
      { isCorrect: false, points: 2 },
      { isCorrect: true, points: 1 },
    ]);
    expect(result.score).toBe(3);
    expect(result.totalPoints).toBe(5);
  });

  it("calculates percentage", () => {
    expect(calculatePercentage(3, 5)).toBe(60);
    expect(calculatePercentage(10, 10)).toBe(100);
    expect(calculatePercentage(0, 10)).toBe(0);
  });

  it("handles zero total points", () => {
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it("determines pass/fail at 60% threshold", () => {
    expect(isPassed(60, 60)).toBe(true);
    expect(isPassed(59.99, 60)).toBe(false);
    expect(isPassed(100, 60)).toBe(true);
  });

  it("determines pass/fail at custom threshold", () => {
    expect(isPassed(80, 80)).toBe(true);
    expect(isPassed(79, 80)).toBe(false);
  });

  it("scores all-correct quiz", () => {
    const result = calculateScore([
      { isCorrect: true, points: 1 },
      { isCorrect: true, points: 1 },
      { isCorrect: true, points: 1 },
    ]);
    expect(result.score).toBe(result.totalPoints);
  });

  it("scores all-wrong quiz", () => {
    const result = calculateScore([
      { isCorrect: false, points: 1 },
      { isCorrect: false, points: 1 },
    ]);
    expect(result.score).toBe(0);
  });
});
