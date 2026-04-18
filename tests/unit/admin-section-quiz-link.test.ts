import { describe, it, expect } from "vitest";

// Mirrors section-quiz attach/detach logic
function placementLabel(placement: string): string {
  return placement === "BEFORE" ? "ก่อนหมวด" : "หลังหมวด";
}

function isQuizAlreadyAttached(
  sectionQuizzes: { quizId: number }[],
  quizId: number
): boolean {
  return sectionQuizzes.some((sq) => sq.quizId === quizId);
}

function getAvailableQuizzes(
  allQuizzes: { id: number; title: string }[],
  attachedQuizIds: number[]
): { id: number; title: string }[] {
  return allQuizzes.filter((q) => !attachedQuizIds.includes(q.id));
}

describe("admin section quiz linking — display logic", () => {
  it("returns Thai label for placement", () => {
    expect(placementLabel("BEFORE")).toBe("ก่อนหมวด");
    expect(placementLabel("AFTER")).toBe("หลังหมวด");
  });

  it("detects already attached quiz", () => {
    const attached = [{ quizId: 1 }, { quizId: 3 }];
    expect(isQuizAlreadyAttached(attached, 1)).toBe(true);
    expect(isQuizAlreadyAttached(attached, 2)).toBe(false);
  });

  it("filters out already attached quizzes from available list", () => {
    const all = [{ id: 1, title: "A" }, { id: 2, title: "B" }, { id: 3, title: "C" }];
    const result = getAvailableQuizzes(all, [1, 3]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("returns all quizzes when none are attached", () => {
    const all = [{ id: 1, title: "A" }, { id: 2, title: "B" }];
    const result = getAvailableQuizzes(all, []);
    expect(result).toHaveLength(2);
  });
});
