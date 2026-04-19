import { describe, it, expect } from "vitest";

// Pure helpers for the score roster page.

type ComponentScore = { score: number | null; itemCount: number; weight: number };
type ScoreBreakdown = {
  lessonQuiz: ComponentScore;
  sectionQuiz: ComponentScore;
  lessonAssignment: ComponentScore;
  courseAssignment: ComponentScore;
  finalScore: number | null;
};

function scoreColor(finalScore: number | null): "green" | "amber" | "red" | "muted" {
  if (finalScore === null) return "muted";
  if (finalScore >= 70) return "green";
  if (finalScore >= 50) return "amber";
  return "red";
}

function formatComponentCell(c: ComponentScore): string {
  if (c.itemCount === 0) return "—";
  if (c.score === null) return `— (0/${c.itemCount})`;
  return `${c.score.toFixed(1)} (${c.itemCount}/${c.itemCount})`;
}

function buildCsvRow(
  name: string,
  email: string,
  group: string | null,
  bd: ScoreBreakdown
): string {
  const cols = [
    `"${name}"`,
    email,
    group ?? "",
    bd.lessonQuiz.score?.toFixed(2) ?? "",
    bd.sectionQuiz.score?.toFixed(2) ?? "",
    bd.lessonAssignment.score?.toFixed(2) ?? "",
    bd.courseAssignment.score?.toFixed(2) ?? "",
    bd.finalScore?.toFixed(2) ?? "",
  ];
  return cols.join(",");
}

describe("scoreColor", () => {
  it("green for score >= 70", () => {
    expect(scoreColor(70)).toBe("green");
    expect(scoreColor(100)).toBe("green");
  });

  it("amber for 50–69", () => {
    expect(scoreColor(50)).toBe("amber");
    expect(scoreColor(69.9)).toBe("amber");
  });

  it("red for < 50", () => {
    expect(scoreColor(0)).toBe("red");
    expect(scoreColor(49.9)).toBe("red");
  });

  it("muted for null", () => {
    expect(scoreColor(null)).toBe("muted");
  });
});

describe("formatComponentCell", () => {
  it("shows dash when no items in course", () => {
    expect(formatComponentCell({ score: null, itemCount: 0, weight: 25 })).toBe("—");
  });

  it("shows dash with count when items exist but no attempts", () => {
    expect(formatComponentCell({ score: null, itemCount: 3, weight: 25 })).toBe("— (0/3)");
  });

  it("shows score with count when attempted", () => {
    expect(formatComponentCell({ score: 72.5, itemCount: 2, weight: 25 })).toBe("72.5 (2/2)");
  });
});

describe("buildCsvRow", () => {
  const breakdown: ScoreBreakdown = {
    lessonQuiz:       { score: 80,   itemCount: 2, weight: 25 },
    sectionQuiz:      { score: 70,   itemCount: 1, weight: 25 },
    lessonAssignment: { score: 90,   itemCount: 1, weight: 25 },
    courseAssignment: { score: null, itemCount: 0, weight: 25 },
    finalScore: 80,
  };

  it("generates a comma-separated row", () => {
    const row = buildCsvRow("สมชาย ใจดี", "test@example.com", "กลุ่ม A", breakdown);
    expect(row).toContain('"สมชาย ใจดี"');
    expect(row).toContain("test@example.com");
    expect(row).toContain("80.00");
    expect(row).toContain("70.00");
    expect(row).toContain("90.00");
    expect(row).toContain("80.00"); // finalScore
  });

  it("leaves empty string for null component score", () => {
    const row = buildCsvRow("test", "t@t.com", null, breakdown);
    const cols = row.split(",");
    // courseAssignment score column (index 6) should be empty
    expect(cols[6]).toBe("");
  });

  it("handles null group as empty string", () => {
    const row = buildCsvRow("name", "e@e.com", null, breakdown);
    expect(row.split(",")[2]).toBe("");
  });
});
