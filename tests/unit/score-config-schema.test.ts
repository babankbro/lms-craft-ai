import { describe, it, expect } from "vitest";

// Validates the shape of CourseScoreConfig and the weight-sum invariant.
// Pure logic — no DB access.

type CourseScoreConfig = {
  courseId: number;
  lessonQuizWeight: number;
  sectionQuizWeight: number;
  lessonAssignmentWeight: number;
  courseAssignmentWeight: number;
};

function totalWeight(cfg: CourseScoreConfig): number {
  return (
    cfg.lessonQuizWeight +
    cfg.sectionQuizWeight +
    cfg.lessonAssignmentWeight +
    cfg.courseAssignmentWeight
  );
}

function isValidConfig(cfg: CourseScoreConfig): boolean {
  const weights = [
    cfg.lessonQuizWeight,
    cfg.sectionQuizWeight,
    cfg.lessonAssignmentWeight,
    cfg.courseAssignmentWeight,
  ];
  if (weights.some((w) => w < 0 || w > 100)) return false;
  return Math.abs(totalWeight(cfg) - 100) <= 0.01;
}

const defaultConfig: CourseScoreConfig = {
  courseId: 1,
  lessonQuizWeight: 25,
  sectionQuizWeight: 25,
  lessonAssignmentWeight: 25,
  courseAssignmentWeight: 25,
};

describe("CourseScoreConfig — default weights", () => {
  it("defaults sum to 100", () => {
    expect(totalWeight(defaultConfig)).toBe(100);
  });

  it("default config is valid", () => {
    expect(isValidConfig(defaultConfig)).toBe(true);
  });
});

describe("CourseScoreConfig — weight validation", () => {
  it("accepts asymmetric weights that sum to 100", () => {
    expect(
      isValidConfig({ courseId: 1, lessonQuizWeight: 40, sectionQuizWeight: 20, lessonAssignmentWeight: 30, courseAssignmentWeight: 10 })
    ).toBe(true);
  });

  it("rejects weights that do not sum to 100", () => {
    expect(
      isValidConfig({ courseId: 1, lessonQuizWeight: 30, sectionQuizWeight: 30, lessonAssignmentWeight: 30, courseAssignmentWeight: 30 })
    ).toBe(false);
  });

  it("accepts config where some weights are 0", () => {
    expect(
      isValidConfig({ courseId: 1, lessonQuizWeight: 100, sectionQuizWeight: 0, lessonAssignmentWeight: 0, courseAssignmentWeight: 0 })
    ).toBe(true);
  });

  it("rejects negative weights", () => {
    expect(
      isValidConfig({ courseId: 1, lessonQuizWeight: -10, sectionQuizWeight: 50, lessonAssignmentWeight: 40, courseAssignmentWeight: 20 })
    ).toBe(false);
  });

  it("rejects weights over 100 for a single field", () => {
    expect(
      isValidConfig({ courseId: 1, lessonQuizWeight: 110, sectionQuizWeight: 0, lessonAssignmentWeight: 0, courseAssignmentWeight: 0 })
    ).toBe(false);
  });
});

describe("Assignment.maxScore field", () => {
  type Assignment = { id: number; title: string; maxScore: number | null };

  it("maxScore is nullable (optional field)", () => {
    const a: Assignment = { id: 1, title: "Essay", maxScore: null };
    expect(a.maxScore).toBeNull();
  });

  it("maxScore can be set to a positive number", () => {
    const a: Assignment = { id: 2, title: "Quiz", maxScore: 100 };
    expect(a.maxScore).toBe(100);
  });

  it("score normalization uses maxScore when present", () => {
    function normalize(score: number, maxScore: number | null): number {
      if (maxScore && maxScore > 0) return (score / maxScore) * 100;
      return score; // treat as percentage directly
    }
    expect(normalize(80, 100)).toBe(80);
    expect(normalize(40, 50)).toBe(80);
    expect(normalize(75, null)).toBe(75);
  });
});
