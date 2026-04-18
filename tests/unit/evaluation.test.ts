import { describe, it, expect } from "vitest";

function calculateAverageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

function isEvaluationValid(
  score: number,
  maxScore: number,
  feedback?: string
): { valid: boolean; error?: string } {
  if (score < 0) return { valid: false, error: "Score cannot be negative" };
  if (score > maxScore) return { valid: false, error: "Score exceeds max" };
  return { valid: true };
}

describe("Evaluation scoring", () => {
  it("calculates average of multiple evaluations", () => {
    expect(calculateAverageScore([80, 90, 70])).toBe(80);
    expect(calculateAverageScore([100])).toBe(100);
    expect(calculateAverageScore([0, 0, 0])).toBe(0);
  });

  it("handles empty scores array", () => {
    expect(calculateAverageScore([])).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculateAverageScore([85, 90])).toBe(87.5);
    expect(calculateAverageScore([85, 86, 87])).toBe(86);
  });

  it("validates score within range", () => {
    expect(isEvaluationValid(50, 100)).toEqual({ valid: true });
    expect(isEvaluationValid(100, 100)).toEqual({ valid: true });
    expect(isEvaluationValid(0, 100)).toEqual({ valid: true });
  });

  it("rejects negative score", () => {
    expect(isEvaluationValid(-1, 100)).toEqual({ valid: false, error: "Score cannot be negative" });
  });

  it("rejects score exceeding max", () => {
    expect(isEvaluationValid(101, 100)).toEqual({ valid: false, error: "Score exceeds max" });
  });
});
