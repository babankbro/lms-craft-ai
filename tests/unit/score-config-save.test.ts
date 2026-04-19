import { describe, it, expect } from "vitest";

// Pure validation logic mirroring the saveScoreConfig action.

type WeightInput = {
  lessonQuizWeight: number;
  sectionQuizWeight: number;
  lessonAssignmentWeight: number;
  courseAssignmentWeight: number;
};

function validateWeights(w: WeightInput): { ok: boolean; error?: string } {
  const vals = [w.lessonQuizWeight, w.sectionQuizWeight, w.lessonAssignmentWeight, w.courseAssignmentWeight];
  if (vals.some((v) => isNaN(v) || v < 0 || v > 100))
    return { ok: false, error: "Each weight must be between 0 and 100" };
  const total = vals.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.01)
    return { ok: false, error: `Weights must sum to 100 (got ${total})` };
  return { ok: true };
}

// Mirrors assignment maxScore normalization used by getStudentCourseScore.
function normalizeAssignmentScore(
  score: number,
  assignmentMaxScore: number | null,
): number {
  const denom = assignmentMaxScore ?? 100;
  return Math.min(100, (score / denom) * 100);
}

describe("validateWeights", () => {
  it("accepts equal 25/25/25/25", () => {
    expect(validateWeights({ lessonQuizWeight: 25, sectionQuizWeight: 25, lessonAssignmentWeight: 25, courseAssignmentWeight: 25 }).ok).toBe(true);
  });

  it("accepts asymmetric weights summing to 100", () => {
    expect(validateWeights({ lessonQuizWeight: 40, sectionQuizWeight: 20, lessonAssignmentWeight: 30, courseAssignmentWeight: 10 }).ok).toBe(true);
  });

  it("accepts weights with zeros summing to 100", () => {
    expect(validateWeights({ lessonQuizWeight: 100, sectionQuizWeight: 0, lessonAssignmentWeight: 0, courseAssignmentWeight: 0 }).ok).toBe(true);
  });

  it("rejects weights summing to 99", () => {
    const r = validateWeights({ lessonQuizWeight: 25, sectionQuizWeight: 25, lessonAssignmentWeight: 25, courseAssignmentWeight: 24 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/100/);
  });

  it("rejects negative weight", () => {
    const r = validateWeights({ lessonQuizWeight: -5, sectionQuizWeight: 35, lessonAssignmentWeight: 35, courseAssignmentWeight: 35 });
    expect(r.ok).toBe(false);
  });

  it("rejects weight exceeding 100", () => {
    const r = validateWeights({ lessonQuizWeight: 110, sectionQuizWeight: 0, lessonAssignmentWeight: 0, courseAssignmentWeight: 0 });
    expect(r.ok).toBe(false);
  });

  it("accepts float weights (e.g. 33.4/33.3/33.3) summing to ~100", () => {
    const r = validateWeights({ lessonQuizWeight: 33.4, sectionQuizWeight: 33.3, lessonAssignmentWeight: 33.3, courseAssignmentWeight: 0 });
    // 33.4+33.3+33.3 = 100.0
    expect(r.ok).toBe(true);
  });
});

describe("assignment maxScore normalization in save context", () => {
  it("normalizes 80/100 to 80%", () => {
    expect(normalizeAssignmentScore(80, 100)).toBe(80);
  });

  it("normalizes 40/50 to 80%", () => {
    expect(normalizeAssignmentScore(40, 50)).toBe(80);
  });

  it("falls back to /100 when maxScore is null", () => {
    expect(normalizeAssignmentScore(75, null)).toBe(75);
  });

  it("caps at 100 even if score exceeds maxScore", () => {
    expect(normalizeAssignmentScore(110, 100)).toBe(100);
  });
});
