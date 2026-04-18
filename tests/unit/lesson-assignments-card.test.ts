import { describe, it, expect } from "vitest";

// Mirrors the display logic for the assignments card on lesson editor
function formatAssignmentMeta(submissionCount: number, dueDate: Date | null): string {
  const parts: string[] = [`${submissionCount} การส่งงาน`];
  if (dueDate) {
    parts.push(`กำหนด ${dueDate.toLocaleDateString("th-TH")}`);
  }
  return parts.join(" · ");
}

function canDeleteAssignment(submissionCount: number): boolean {
  return submissionCount === 0;
}

describe("lesson assignments card — display logic", () => {
  it("shows submission count without due date", () => {
    expect(formatAssignmentMeta(3, null)).toBe("3 การส่งงาน");
  });

  it("shows submission count with due date", () => {
    const due = new Date("2026-05-01T00:00:00.000Z");
    const result = formatAssignmentMeta(2, due);
    expect(result).toContain("2 การส่งงาน");
    expect(result).toContain("กำหนด");
  });

  it("shows zero submissions", () => {
    expect(formatAssignmentMeta(0, null)).toBe("0 การส่งงาน");
  });

  it("allows delete when no submissions", () => {
    expect(canDeleteAssignment(0)).toBe(true);
  });

  it("disables delete when submissions exist", () => {
    expect(canDeleteAssignment(1)).toBe(false);
    expect(canDeleteAssignment(99)).toBe(false);
  });
});
