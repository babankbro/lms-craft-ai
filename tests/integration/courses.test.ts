import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Course & Lesson models", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.lessonProgress.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.course.deleteMany({ where: { slug: { startsWith: "test-" } } });
  });

  afterAll(async () => {
    await prisma.lessonProgress.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.course.deleteMany({ where: { slug: { startsWith: "test-" } } });
    await prisma.$disconnect();
  });

  it("creates course with lessons", async () => {
    const course = await prisma.course.create({
      data: {
        title: "Test Course",
        slug: "test-course-1",
        lessons: {
          create: [
            { title: "Lesson 1", content: "# Hello", order: 1 },
            { title: "Lesson 2", content: "## World", order: 2 },
          ],
        },
      },
      include: { lessons: true },
    });

    expect(course.lessons).toHaveLength(2);
    expect(course.lessons[0].title).toBe("Lesson 1");
  });

  it("enforces unique slug", async () => {
    await expect(
      prisma.course.create({
        data: { title: "Dupe", slug: "test-course-1" },
      })
    ).rejects.toThrow();
  });

  it("cascades delete from course to lessons", async () => {
    const course = await prisma.course.create({
      data: {
        title: "To Delete",
        slug: "test-delete-cascade",
        lessons: { create: [{ title: "L1", content: "", order: 1 }] },
      },
      include: { lessons: true },
    });

    const lessonId = course.lessons[0].id;
    await prisma.course.delete({ where: { id: course.id } });

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    expect(lesson).toBeNull();
  });

  it("tracks lesson progress with percentage", async () => {
    const user = await prisma.user.findFirst({ where: { role: "STUDENT" } });
    if (!user) throw new Error("Need seeded STUDENT user");

    const course = await prisma.course.create({
      data: {
        title: "Progress Test",
        slug: "test-progress",
        lessons: {
          create: [
            { title: "L1", content: "", order: 1 },
            { title: "L2", content: "", order: 2 },
            { title: "L3", content: "", order: 3 },
            { title: "L4", content: "", order: 4 },
          ],
        },
      },
      include: { lessons: true },
    });

    // Complete 2 of 4 lessons
    await prisma.lessonProgress.create({
      data: { userId: user.id, lessonId: course.lessons[0].id, isCompleted: true },
    });
    await prisma.lessonProgress.create({
      data: { userId: user.id, lessonId: course.lessons[1].id, isCompleted: true },
    });

    const total = course.lessons.length;
    const completed = await prisma.lessonProgress.count({
      where: { userId: user.id, lesson: { courseId: course.id }, isCompleted: true },
    });

    expect(Math.round((completed / total) * 100)).toBe(50);
  });

  it("creates enrollment with unique constraint", async () => {
    const user = await prisma.user.findFirst({ where: { role: "STUDENT" } });
    const course = await prisma.course.findFirst({ where: { slug: "test-progress" } });
    if (!user || !course) throw new Error("Need test data");

    await prisma.enrollment.create({
      data: { userId: user.id, courseId: course.id },
    });

    // Duplicate should fail
    await expect(
      prisma.enrollment.create({
        data: { userId: user.id, courseId: course.id },
      })
    ).rejects.toThrow();
  });
});
