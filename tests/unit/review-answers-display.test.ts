import { describe, it, expect } from "vitest";

type ResponseType = "TEXT" | "FILE" | "BOTH";

type Answer = {
  questionId: number;
  textAnswer: string | null;
  question: { prompt: string; order: number; responseType: ResponseType };
  files: { id: number; fileName: string; fileKey: string; fileSize: number }[];
};

function sortAnswersByOrder(answers: Answer[]): Answer[] {
  return [...answers].sort((a, b) => a.question.order - b.question.order);
}

function getAnswerDisplayText(answer: Answer): string | null {
  if (answer.textAnswer && answer.textAnswer.trim()) return answer.textAnswer;
  return null;
}

function shouldShowPlaceholder(answer: Answer): boolean {
  return !answer.textAnswer?.trim() && answer.files.length === 0;
}

describe("review answers display — sorting", () => {
  const answers: Answer[] = [
    {
      questionId: 3,
      textAnswer: "Third answer",
      question: { prompt: "Q3", order: 3, responseType: "TEXT" },
      files: [],
    },
    {
      questionId: 1,
      textAnswer: "First answer",
      question: { prompt: "Q1", order: 1, responseType: "TEXT" },
      files: [],
    },
    {
      questionId: 2,
      textAnswer: "Second answer",
      question: { prompt: "Q2", order: 2, responseType: "TEXT" },
      files: [],
    },
  ];

  it("sorts answers by question order ascending", () => {
    const sorted = sortAnswersByOrder(answers);
    expect(sorted[0].question.order).toBe(1);
    expect(sorted[1].question.order).toBe(2);
    expect(sorted[2].question.order).toBe(3);
  });

  it("does not mutate the original array", () => {
    const original = [...answers];
    sortAnswersByOrder(answers);
    expect(answers[0].question.order).toBe(original[0].question.order);
  });
});

describe("review answers display — empty answer guard", () => {
  it("returns null for empty text answer", () => {
    const answer: Answer = {
      questionId: 1,
      textAnswer: "",
      question: { prompt: "Q1", order: 1, responseType: "TEXT" },
      files: [],
    };
    expect(getAnswerDisplayText(answer)).toBeNull();
  });

  it("returns null for whitespace-only text answer", () => {
    const answer: Answer = {
      questionId: 1,
      textAnswer: "   ",
      question: { prompt: "Q1", order: 1, responseType: "TEXT" },
      files: [],
    };
    expect(getAnswerDisplayText(answer)).toBeNull();
  });

  it("returns text when present", () => {
    const answer: Answer = {
      questionId: 1,
      textAnswer: "My answer",
      question: { prompt: "Q1", order: 1, responseType: "TEXT" },
      files: [],
    };
    expect(getAnswerDisplayText(answer)).toBe("My answer");
  });

  it("shows placeholder when no text and no files", () => {
    const answer: Answer = {
      questionId: 1,
      textAnswer: null,
      question: { prompt: "Q1", order: 1, responseType: "TEXT" },
      files: [],
    };
    expect(shouldShowPlaceholder(answer)).toBe(true);
  });

  it("does not show placeholder when files exist (even without text)", () => {
    const answer: Answer = {
      questionId: 1,
      textAnswer: null,
      question: { prompt: "Q1", order: 1, responseType: "FILE" },
      files: [{ id: 1, fileName: "doc.pdf", fileKey: "abc", fileSize: 1024 }],
    };
    expect(shouldShowPlaceholder(answer)).toBe(false);
  });
});
