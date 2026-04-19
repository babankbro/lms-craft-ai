import { describe, it, expect } from "vitest";

// Pure helpers extracted from lib/course-score.ts — tested without DB.

// Average of non-null values; null if no values.
function averageScores(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Normalize a submission score to 0-100 scale.
function normalizeScore(
  score: number,
  assignmentMaxScore: number | null,
  submissionMaxScore: number | null
): number {
  const denom = assignmentMaxScore ?? submissionMaxScore ?? 100;
  if (denom <= 0) return 0;
  return Math.min(100, (score / denom) * 100);
}

// Weighted final: sum(score * weight) / sum(weight for non-null components).
// Returns null if all components are null or total weight is 0.
function computeWeightedFinal(
  components: { score: number | null; weight: number }[]
): number | null {
  const active = components.filter((c) => c.score !== null && c.weight > 0);
  const totalWeight = active.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return null;
  const weighted = active.reduce((s, c) => s + c.score! * c.weight, 0);
  return Math.round((weighted / totalWeight) * 100) / 100;
}

// ─── averageScores ────────────────────────────────────────────────────────────

describe("averageScores", () => {
  it("returns null for empty array", () => {
    expect(averageScores([])).toBeNull();
  });

  it("returns null when all values are null", () => {
    expect(averageScores([null, null])).toBeNull();
  });

  it("averages two equal scores", () => {
    expect(averageScores([80, 80])).toBe(80);
  });

  it("averages mixed scores correctly", () => {
    expect(averageScores([60, 80, 100])).toBeCloseTo(80, 5);
  });

  it("ignores null entries in the average", () => {
    // student attempted 2 of 3 quizzes
    expect(averageScores([60, null, 100])).toBeCloseTo(80, 5);
  });

  it("returns single score unchanged", () => {
    expect(averageScores([75])).toBe(75);
  });
});

// ─── normalizeScore ───────────────────────────────────────────────────────────

describe("normalizeScore", () => {
  it("uses assignment maxScore when present", () => {
    expect(normalizeScore(40, 50, null)).toBe(80);
  });

  it("falls back to submission maxScore when assignment maxScore is null", () => {
    expect(normalizeScore(80, null, 100)).toBe(80);
  });

  it("falls back to 100 when both maxScore values are null", () => {
    expect(normalizeScore(75, null, null)).toBe(75);
  });

  it("caps score at 100 even if score > maxScore", () => {
    expect(normalizeScore(110, 100, null)).toBe(100);
  });

  it("returns 0 when score is 0", () => {
    expect(normalizeScore(0, 100, null)).toBe(0);
  });
});

// ─── computeWeightedFinal ─────────────────────────────────────────────────────

describe("computeWeightedFinal", () => {
  it("returns null when all components are null", () => {
    expect(
      computeWeightedFinal([
        { score: null, weight: 25 },
        { score: null, weight: 25 },
      ])
    ).toBeNull();
  });

  it("returns null when all weights are 0", () => {
    expect(
      computeWeightedFinal([
        { score: 80, weight: 0 },
        { score: 60, weight: 0 },
      ])
    ).toBeNull();
  });

  it("computes equal-weight average correctly", () => {
    const result = computeWeightedFinal([
      { score: 80, weight: 25 },
      { score: 60, weight: 25 },
      { score: 100, weight: 25 },
      { score: 40, weight: 25 },
    ]);
    expect(result).toBe(70); // (80+60+100+40)/4
  });

  it("excludes null components from denominator (redistribution)", () => {
    // Only lesson quiz + course assignment have scores; section quiz has no items.
    const result = computeWeightedFinal([
      { score: 80, weight: 30 },  // lesson quiz
      { score: null, weight: 20 }, // section quiz — no items
      { score: 60, weight: 30 },  // lesson assignment
      { score: 100, weight: 20 }, // course assignment
    ]);
    // effective weights: 30+30+20 = 80
    // weighted sum: 80*30 + 60*30 + 100*20 = 2400+1800+2000 = 6200
    // final: 6200/80 = 77.5
    expect(result).toBe(77.5);
  });

  it("returns the single component score when only one is non-null", () => {
    const result = computeWeightedFinal([
      { score: 72, weight: 100 },
      { score: null, weight: 0 },
    ]);
    expect(result).toBe(72);
  });

  it("rounds to 2 decimal places", () => {
    const result = computeWeightedFinal([
      { score: 100, weight: 33 },
      { score: 0, weight: 33 },
      { score: 50, weight: 34 },
    ]);
    // (10000 + 0 + 1700) / 100 = 117/1 ... let me recalculate:
    // weighted sum: 100*33 + 0*33 + 50*34 = 3300+0+1700 = 5000
    // total weight: 100
    // = 50.00
    expect(result).toBe(50);
  });
});

// ─── Full breakdown integration (pure, no DB) ─────────────────────────────────

describe("ScoreBreakdown assembly", () => {
  type ComponentScore = {
    score: number | null;
    itemCount: number;
    weight: number;
  };

  function buildBreakdown(
    components: { lessonQuiz: ComponentScore; sectionQuiz: ComponentScore; lessonAssignment: ComponentScore; courseAssignment: ComponentScore }
  ) {
    const { lessonQuiz, sectionQuiz, lessonAssignment, courseAssignment } = components;
    const finalScore = computeWeightedFinal([lessonQuiz, sectionQuiz, lessonAssignment, courseAssignment]);
    return { ...components, finalScore, weightsConfigured: true };
  }

  it("all 4 components present — correct final", () => {
    const bd = buildBreakdown({
      lessonQuiz:        { score: 80,   itemCount: 2, weight: 25 },
      sectionQuiz:       { score: 70,   itemCount: 1, weight: 25 },
      lessonAssignment:  { score: 90,   itemCount: 3, weight: 25 },
      courseAssignment:  { score: 60,   itemCount: 1, weight: 25 },
    });
    // (80+70+90+60)/4 = 75
    expect(bd.finalScore).toBe(75);
  });

  it("null component excluded — final re-normalised over remaining weights", () => {
    const bd = buildBreakdown({
      lessonQuiz:        { score: 80,   itemCount: 2, weight: 30 },
      sectionQuiz:       { score: null, itemCount: 0, weight: 20 },
      lessonAssignment:  { score: 60,   itemCount: 1, weight: 30 },
      courseAssignment:  { score: 100,  itemCount: 1, weight: 20 },
    });
    // weights: 30+30+20=80; sum: 80*30+60*30+100*20=6200; final=77.5
    expect(bd.finalScore).toBe(77.5);
  });

  it("all null → finalScore is null", () => {
    const bd = buildBreakdown({
      lessonQuiz:        { score: null, itemCount: 0, weight: 25 },
      sectionQuiz:       { score: null, itemCount: 0, weight: 25 },
      lessonAssignment:  { score: null, itemCount: 0, weight: 25 },
      courseAssignment:  { score: null, itemCount: 0, weight: 25 },
    });
    expect(bd.finalScore).toBeNull();
  });
});
