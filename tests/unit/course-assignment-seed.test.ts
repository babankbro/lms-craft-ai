import { describe, it, expect } from "vitest";

/**
 * Unit-level invariants for course-level assignment data shape.
 * These mirror the constraints enforced by the schema and seed:
 *   - course-level assignment has lessonId = null and courseId set
 *   - lesson-level assignment has lessonId set and may omit courseId
 */

type AssignmentShape = {
  lessonId: number | null;
  courseId: number | null;
  title: string;
  questions: { prompt: string; responseType: "TEXT" | "FILE" | "BOTH"; required: boolean }[];
};

function isCourseAssignment(a: AssignmentShape): boolean {
  return a.lessonId === null && a.courseId !== null;
}

function isLessonAssignment(a: AssignmentShape): boolean {
  return a.lessonId !== null;
}

function validateCourseAssignment(a: AssignmentShape): string[] {
  const errors: string[] = [];
  if (a.lessonId !== null) errors.push("course-level assignment must have lessonId = null");
  if (!a.courseId) errors.push("course-level assignment must have courseId");
  if (!a.title?.trim()) errors.push("title is required");
  if (a.questions.length === 0) errors.push("must have at least one question");
  return errors;
}

describe("course-level assignment invariants", () => {
  const validCourseAssign: AssignmentShape = {
    lessonId: null,
    courseId: 1,
    title: "งานสรุปการเรียนรู้ระดับวิชา",
    questions: [
      { prompt: "สรุปความรู้", responseType: "TEXT", required: true },
      { prompt: "อัปโหลดหลักฐาน", responseType: "FILE", required: false },
    ],
  };

  const lessonAssign: AssignmentShape = {
    lessonId: 5,
    courseId: null,
    title: "แผนการสอน",
    questions: [{ prompt: "อธิบาย", responseType: "TEXT", required: true }],
  };

  it("identifies course-level assignment correctly", () => {
    expect(isCourseAssignment(validCourseAssign)).toBe(true);
    expect(isCourseAssignment(lessonAssign)).toBe(false);
  });

  it("identifies lesson-level assignment correctly", () => {
    expect(isLessonAssignment(lessonAssign)).toBe(true);
    expect(isLessonAssignment(validCourseAssign)).toBe(false);
  });

  it("validates a valid course assignment with no errors", () => {
    expect(validateCourseAssignment(validCourseAssign)).toHaveLength(0);
  });

  it("rejects assignment with lessonId set as a course assignment", () => {
    const bad: AssignmentShape = { ...validCourseAssign, lessonId: 3 };
    expect(validateCourseAssignment(bad)).toContain(
      "course-level assignment must have lessonId = null"
    );
  });

  it("rejects assignment missing courseId", () => {
    const bad: AssignmentShape = { ...validCourseAssign, courseId: null };
    expect(validateCourseAssignment(bad)).toContain(
      "course-level assignment must have courseId"
    );
  });

  it("rejects assignment with empty title", () => {
    const bad: AssignmentShape = { ...validCourseAssign, title: "  " };
    expect(validateCourseAssignment(bad)).toContain("title is required");
  });

  it("rejects assignment with no questions", () => {
    const bad: AssignmentShape = { ...validCourseAssign, questions: [] };
    expect(validateCourseAssignment(bad)).toContain("must have at least one question");
  });

  it("seed Final Reflection assignment passes validation", () => {
    const finalReflection: AssignmentShape = {
      lessonId: null,
      courseId: 1,
      title: "งานสรุปการเรียนรู้ระดับวิชา (Final Reflection)",
      questions: [
        { prompt: "สรุปความรู้และทักษะสำคัญ", responseType: "TEXT", required: true },
        { prompt: "อธิบายวิธีประยุกต์ใช้", responseType: "BOTH", required: true },
        { prompt: "อัปโหลด Mini Portfolio", responseType: "FILE", required: false },
        { prompt: "เป้าหมายพัฒนาวิชาชีพ", responseType: "TEXT", required: true },
      ],
    };
    expect(validateCourseAssignment(finalReflection)).toHaveLength(0);
    expect(finalReflection.questions).toHaveLength(4);
  });

  it("seed Feedback Survey assignment passes validation", () => {
    const feedbackSurvey: AssignmentShape = {
      lessonId: null,
      courseId: 1,
      title: "แบบสอบถามความพึงพอใจและข้อเสนอแนะหลักสูตร",
      questions: [
        { prompt: "สิ่งที่ชอบมากที่สุด", responseType: "TEXT", required: true },
        { prompt: "สิ่งที่ควรปรับปรุง", responseType: "TEXT", required: true },
        { prompt: "จะแนะนำหลักสูตรนี้หรือไม่", responseType: "TEXT", required: true },
      ],
    };
    expect(validateCourseAssignment(feedbackSurvey)).toHaveLength(0);
    expect(feedbackSurvey.questions).toHaveLength(3);
  });
});
