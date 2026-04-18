import { describe, it, expect } from "vitest";

type Choice = { text: string; isCorrect: boolean };
type Question = { questionText: string; points: number; choices: Choice[] };
type QuizInput = { title: string; questions: Question[] };

function validateQuiz(quiz: QuizInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!quiz.title?.trim()) errors.push("Quiz must have a title");

  if (quiz.questions.length === 0) errors.push("Quiz must have at least one question");

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    if (q.choices.length < 2)
      errors.push(`Question ${i + 1}: must have at least 2 choices`);

    const hasCorrect = q.choices.some((c) => c.isCorrect);
    if (!hasCorrect)
      errors.push(`Question ${i + 1}: must have at least one correct answer`);
  }

  return { valid: errors.length === 0, errors };
}

describe("quiz validator", () => {
  it("accepts a valid quiz", () => {
    const result = validateQuiz({
      title: "Test Quiz",
      questions: [
        {
          questionText: "What is 2+2?",
          points: 1,
          choices: [
            { text: "3", isCorrect: false },
            { text: "4", isCorrect: true },
          ],
        },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects quiz with no correct answer", () => {
    const result = validateQuiz({
      title: "Bad Quiz",
      questions: [
        {
          questionText: "Pick one",
          points: 1,
          choices: [
            { text: "A", isCorrect: false },
            { text: "B", isCorrect: false },
          ],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Question 1: must have at least one correct answer");
  });

  it("rejects question with fewer than 2 choices", () => {
    const result = validateQuiz({
      title: "Bad Quiz",
      questions: [
        {
          questionText: "Only one choice",
          points: 1,
          choices: [{ text: "A", isCorrect: true }],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Question 1: must have at least 2 choices");
  });

  it("rejects quiz with no questions", () => {
    const result = validateQuiz({ title: "Empty Quiz", questions: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Quiz must have at least one question");
  });

  it("rejects quiz with no title", () => {
    const result = validateQuiz({
      title: "",
      questions: [
        {
          questionText: "Q",
          points: 1,
          choices: [
            { text: "A", isCorrect: true },
            { text: "B", isCorrect: false },
          ],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Quiz must have a title");
  });

  it("collects multiple errors", () => {
    const result = validateQuiz({
      title: "",
      questions: [
        {
          questionText: "Q",
          points: 1,
          choices: [{ text: "A", isCorrect: false }],
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
