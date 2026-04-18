import { describe, it, expect } from "vitest";

// Mirrors quiz question/choice display logic from quiz editor
function formatPoints(points: number): string {
  return points === 1 ? "1 คะแนน" : `${points} คะแนน`;
}

function isChoiceLinkedToAnswer(choiceId: number, answerChoiceIds: number[]): boolean {
  return answerChoiceIds.includes(choiceId);
}

function canDeleteQuiz(attemptCount: number): boolean {
  return attemptCount === 0;
}

describe("admin quiz edit page — display logic", () => {
  it("formats single point correctly", () => {
    expect(formatPoints(1)).toBe("1 คะแนน");
  });

  it("formats multiple points correctly", () => {
    expect(formatPoints(5)).toBe("5 คะแนน");
  });

  it("checks if a choice is a correct answer", () => {
    expect(isChoiceLinkedToAnswer(3, [1, 3, 5])).toBe(true);
    expect(isChoiceLinkedToAnswer(2, [1, 3, 5])).toBe(false);
  });

  it("blocks delete when quiz has attempts", () => {
    expect(canDeleteQuiz(0)).toBe(true);
    expect(canDeleteQuiz(1)).toBe(false);
  });
});
