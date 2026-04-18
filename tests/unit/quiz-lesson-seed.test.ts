import { describe, it, expect } from "vitest";

// Mirrors seed logic: idempotent LessonQuiz creation
function buildLessonQuizRecords(
  lessons: { id: number; order: number }[],
  quizzes: { id: number; type: string }[],
): { lessonId: number; quizId: number; order: number }[] {
  const lesson1 = lessons.find((l) => l.order === 10);
  const lesson2 = lessons.find((l) => l.order === 20);
  const preQuiz = quizzes.find((q) => q.type === "PRE_TEST");
  const postQuiz = quizzes.find((q) => q.type === "POST_TEST");

  const records: { lessonId: number; quizId: number; order: number }[] = [];
  if (lesson1 && preQuiz) records.push({ lessonId: lesson1.id, quizId: preQuiz.id, order: 0 });
  if (lesson2 && postQuiz) records.push({ lessonId: lesson2.id, quizId: postQuiz.id, order: 0 });
  return records;
}

describe("seed — lesson quiz records", () => {
  const lessons = [
    { id: 1, order: 10 },
    { id: 2, order: 20 },
    { id: 3, order: 30 },
  ];
  const quizzes = [
    { id: 10, type: "PRE_TEST" },
    { id: 11, type: "POST_TEST" },
  ];

  it("creates a LessonQuiz record for lesson1 → PRE_TEST quiz", () => {
    const records = buildLessonQuizRecords(lessons, quizzes);
    const rec = records.find((r) => r.lessonId === 1);
    expect(rec).toBeDefined();
    expect(rec?.quizId).toBe(10);
    expect(rec?.order).toBe(0);
  });

  it("creates a LessonQuiz record for lesson2 → POST_TEST quiz", () => {
    const records = buildLessonQuizRecords(lessons, quizzes);
    const rec = records.find((r) => r.lessonId === 2);
    expect(rec).toBeDefined();
    expect(rec?.quizId).toBe(11);
    expect(rec?.order).toBe(0);
  });

  it("creates exactly 2 records", () => {
    const records = buildLessonQuizRecords(lessons, quizzes);
    expect(records).toHaveLength(2);
  });

  it("produces no records if no matching lesson exists", () => {
    const records = buildLessonQuizRecords([], quizzes);
    expect(records).toHaveLength(0);
  });

  it("produces no records if no matching quiz exists", () => {
    const records = buildLessonQuizRecords(lessons, []);
    expect(records).toHaveLength(0);
  });
});
