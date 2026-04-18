import { describe, it, expect } from "vitest";
import {
  CourseCreateSchema,
  CourseUpdateSchema,
  LessonCreateSchema,
  AttachmentMetaSchema,
} from "@/lib/validators/course";

describe("CourseCreateSchema", () => {
  it("accepts valid data", () => {
    const result = CourseCreateSchema.safeParse({
      title: "หลักสูตรการสอน",
      description: "คำอธิบาย",
    });
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 3 chars", () => {
    const result = CourseCreateSchema.safeParse({ title: "AB" });
    expect(result.success).toBe(false);
  });

  it("accepts without description", () => {
    const result = CourseCreateSchema.safeParse({ title: "Math Course" });
    expect(result.success).toBe(true);
  });
});

describe("CourseUpdateSchema", () => {
  it("accepts valid update", () => {
    const result = CourseUpdateSchema.safeParse({
      id: 1,
      title: "Updated",
      isPublished: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("LessonCreateSchema", () => {
  it("accepts valid lesson", () => {
    const result = LessonCreateSchema.safeParse({
      courseId: 1,
      title: "Lesson 1",
      content: "Hello",
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable youtubeUrl", () => {
    const result = LessonCreateSchema.safeParse({
      courseId: 1,
      title: "Lesson 1",
      content: "Hello",
      youtubeUrl: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("AttachmentMetaSchema", () => {
  it("accepts valid attachment", () => {
    const result = AttachmentMetaSchema.safeParse({
      lessonId: 1,
      fileKey: "lessons/1/abc_report.pdf",
      fileName: "report.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects file over 10MB", () => {
    const result = AttachmentMetaSchema.safeParse({
      lessonId: 1,
      fileKey: "lessons/1/abc_big.pdf",
      fileName: "big.pdf",
      fileSize: 11 * 1024 * 1024,
      mimeType: "application/pdf",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid fileKey pattern", () => {
    const result = AttachmentMetaSchema.safeParse({
      lessonId: 1,
      fileKey: "uploads/random.pdf",
      fileName: "random.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
    });
    expect(result.success).toBe(false);
  });
});
