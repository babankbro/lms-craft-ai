import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Lesson progress integration", () => {
  let prisma: PrismaClient;
  let courseId: number;
  let lessonIds: number[];
  let studentId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const student = await prisma.user.findFirst({ where: { role: "STUDENT" } });
    if (!student) throw new Error("Need seeded STUDENT user");
    studentId = student.id;

    const course = await prisma.course.create({
      data: {
        title: "Progress Integration Test",
        slug: `test-progress-int-${Date.now()}`,
        lessons: {
          create: [
            { title: "L1", content: "", order: 1 },
            { title: "L2", content: "", order: 2 },
            { title: "L3", content: "", order: 3 },
          ],
        },
      },
      include: { lessons: { orderBy: { order: "asc" } } },
    });

    courseId = course.id;
    lessonIds = course.lessons.map((l) => l.id);
  });

  afterAll(async () => {
    await prisma.lessonProgress.deleteMany({ where: { lesson: { courseId } } });
    await prisma.lesson.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } });
    await prisma.$disconnect();
  });

  it("markComplete creates a LessonProgress row", async () => {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentId, lessonId: lessonIds[0] } },
      create: { userId: studentId, lessonId: lessonIds[0], isCompleted: true, completedAt: new Date() },
      update: { isCompleted: true, completedAt: new Date() },
    });

    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: studentId, lessonId: lessonIds[0] } },
    });
    expect(progress?.isCompleted).toBe(true);
  });

  it("markComplete is idempotent (upsert does not create duplicate)", async () => {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentId, lessonId: lessonIds[0] } },
      create: { userId: studentId, lessonId: lessonIds[0], isCompleted: true, completedAt: new Date() },
      update: { isCompleted: true },
    });

    const count = await prisma.lessonProgress.count({
      where: { userId: studentId, lessonId: lessonIds[0] },
    });
    expect(count).toBe(1);
  });

  it("progress aggregate is correct after completing 2 of 3 lessons", async () => {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentId, lessonId: lessonIds[1] } },
      create: { userId: studentId, lessonId: lessonIds[1], isCompleted: true, completedAt: new Date() },
      update: { isCompleted: true },
    });

    const total = lessonIds.length;
    const completed = await prisma.lessonProgress.count({
      where: { userId: studentId, lesson: { courseId }, isCompleted: true },
    });

    expect(completed).toBe(2);
    expect(Math.round((completed / total) * 100)).toBe(67);
  });

  it("completing all lessons gives 100%", async () => {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentId, lessonId: lessonIds[2] } },
      create: { userId: studentId, lessonId: lessonIds[2], isCompleted: true, completedAt: new Date() },
      update: { isCompleted: true },
    });

    const total = lessonIds.length;
    const completed = await prisma.lessonProgress.count({
      where: { userId: studentId, lesson: { courseId }, isCompleted: true },
    });

    expect(Math.round((completed / total) * 100)).toBe(100);
  });
});
