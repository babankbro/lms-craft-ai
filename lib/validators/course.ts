import { z } from "zod";

export const CourseCreateSchema = z.object({
  title: z.string().min(3, "ชื่อวิชาต้องยาวอย่างน้อย 3 ตัวอักษร").max(200),
  description: z.string().max(5000).optional(),
});

export const CourseUpdateSchema = CourseCreateSchema.extend({
  id: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9\u0E00-\u0E7F-]+$/, "รูปแบบ slug ไม่ถูกต้อง").optional(),
  isPublished: z.boolean().optional(),
});

export const LessonCreateSchema = z.object({
  courseId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  content: z.string(),
  youtubeUrl: z.string().url().optional().nullable(),
  order: z.number().int().nonnegative().optional(),
});

export const AttachmentMetaSchema = z.object({
  lessonId: z.number().int().positive(),
  fileKey: z.string().regex(/^lessons\/\d+\/[A-Za-z0-9_.-]+$/),
  fileName: z.string().max(255),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
  mimeType: z.string(),
});
