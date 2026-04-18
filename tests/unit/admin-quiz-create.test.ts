import { describe, it, expect } from "vitest";

const QUIZ_TYPE_LABEL: Record<string, string> = {
  PRE_TEST: "Pre-Test (ก่อนเรียน)",
  POST_TEST: "Post-Test (หลังเรียน)",
  QUIZ: "แบบทดสอบทั่วไป",
};

function getQuizTypeLabel(type: string): string {
  return QUIZ_TYPE_LABEL[type] ?? type;
}

function validatePassingScore(value: number): boolean {
  return value >= 0 && value <= 100;
}

function validateMaxAttempts(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

describe("admin quiz create — validation", () => {
  it("validates passing score range", () => {
    expect(validatePassingScore(0)).toBe(true);
    expect(validatePassingScore(60)).toBe(true);
    expect(validatePassingScore(100)).toBe(true);
    expect(validatePassingScore(-1)).toBe(false);
    expect(validatePassingScore(101)).toBe(false);
  });

  it("validates maxAttempts is non-negative integer", () => {
    expect(validateMaxAttempts(0)).toBe(true);
    expect(validateMaxAttempts(3)).toBe(true);
    expect(validateMaxAttempts(-1)).toBe(false);
  });

  it("returns correct quiz type labels", () => {
    expect(getQuizTypeLabel("PRE_TEST")).toBe("Pre-Test (ก่อนเรียน)");
    expect(getQuizTypeLabel("POST_TEST")).toBe("Post-Test (หลังเรียน)");
    expect(getQuizTypeLabel("QUIZ")).toBe("แบบทดสอบทั่วไป");
  });
});
