import { describe, it, expect } from "vitest";

type ComponentScore = { score: number | null; itemCount: number; weight: number };
type ScoreBreakdown = {
  lessonQuiz: ComponentScore;
  sectionQuiz: ComponentScore;
  lessonAssignment: ComponentScore;
  courseAssignment: ComponentScore;
  finalScore: number | null;
  weightsConfigured: boolean;
};

function computeContribution(c: ComponentScore, finalScore: number | null): number | null {
  if (c.score === null || finalScore === null) return null;
  const activeWeight = c.weight; // contribution = score * weight / 100
  return Math.round((c.score * activeWeight) / 100 * 100) / 100;
}

function formatComponentLabel(c: ComponentScore): string {
  if (c.weight === 0) return "(ไม่นับ)";
  if (c.itemCount === 0) return "ยังไม่มีรายการ";
  if (c.score === null) return `0/${c.itemCount} รายการ`;
  return `${c.score.toFixed(1)}% (${c.itemCount} รายการ)`;
}

function shouldShowBreakdown(bd: ScoreBreakdown): boolean {
  if (!bd.weightsConfigured) return false;
  const total = bd.lessonQuiz.weight + bd.sectionQuiz.weight +
    bd.lessonAssignment.weight + bd.courseAssignment.weight;
  return total > 0;
}

describe("computeContribution", () => {
  it("returns null when score is null", () => {
    expect(computeContribution({ score: null, itemCount: 2, weight: 25 }, 80)).toBeNull();
  });

  it("returns null when finalScore is null", () => {
    expect(computeContribution({ score: 80, itemCount: 2, weight: 25 }, null)).toBeNull();
  });

  it("computes contribution correctly", () => {
    // score=80, weight=25 → contribution = 80*25/100 = 20
    expect(computeContribution({ score: 80, itemCount: 2, weight: 25 }, 80)).toBe(20);
  });

  it("computes zero contribution for zero weight", () => {
    expect(computeContribution({ score: 80, itemCount: 2, weight: 0 }, 80)).toBe(0);
  });
});

describe("formatComponentLabel", () => {
  it("shows ไม่นับ for zero weight", () => {
    expect(formatComponentLabel({ score: 80, itemCount: 2, weight: 0 })).toBe("(ไม่นับ)");
  });

  it("shows ยังไม่มีรายการ when no items", () => {
    expect(formatComponentLabel({ score: null, itemCount: 0, weight: 25 })).toBe("ยังไม่มีรายการ");
  });

  it("shows attempt info when items exist but no score", () => {
    expect(formatComponentLabel({ score: null, itemCount: 3, weight: 25 })).toBe("0/3 รายการ");
  });

  it("shows score with item count when attempted", () => {
    expect(formatComponentLabel({ score: 72.5, itemCount: 2, weight: 25 })).toBe("72.5% (2 รายการ)");
  });
});

describe("shouldShowBreakdown", () => {
  const base: ScoreBreakdown = {
    lessonQuiz: { score: null, itemCount: 0, weight: 25 },
    sectionQuiz: { score: null, itemCount: 0, weight: 25 },
    lessonAssignment: { score: null, itemCount: 0, weight: 25 },
    courseAssignment: { score: null, itemCount: 0, weight: 25 },
    finalScore: null,
    weightsConfigured: true,
  };

  it("shows breakdown when configured and weights sum > 0", () => {
    expect(shouldShowBreakdown(base)).toBe(true);
  });

  it("hides breakdown when weightsConfigured is false", () => {
    expect(shouldShowBreakdown({ ...base, weightsConfigured: false })).toBe(false);
  });

  it("hides breakdown when all weights are 0", () => {
    expect(shouldShowBreakdown({
      ...base,
      lessonQuiz: { ...base.lessonQuiz, weight: 0 },
      sectionQuiz: { ...base.sectionQuiz, weight: 0 },
      lessonAssignment: { ...base.lessonAssignment, weight: 0 },
      courseAssignment: { ...base.courseAssignment, weight: 0 },
    })).toBe(false);
  });
});
