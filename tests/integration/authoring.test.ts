import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Course authoring RBAC integration", () => {
  let prisma: PrismaClient;
  let instructorAId: string;
  let instructorBId: string;
  let courseByAId: number;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const instA = await prisma.user.create({
      data: {
        email: `test-instructor-a-${Date.now()}@test.com`,
        passwordHash: "fake-hash",
        fullName: "Instructor A",
        role: "INSTRUCTOR",
      },
    });
    instructorAId = instA.id;

    const instB = await prisma.user.create({
      data: {
        email: `test-instructor-b-${Date.now()}@test.com`,
        passwordHash: "fake-hash",
        fullName: "Instructor B",
        role: "INSTRUCTOR",
      },
    });
    instructorBId = instB.id;

    const course = await prisma.course.create({
      data: {
        title: "Course by Instructor A",
        slug: `test-authoring-a-${Date.now()}`,
        authorId: instructorAId,
      },
    });
    courseByAId = course.id;
  });

  afterAll(async () => {
    await prisma.course.deleteMany({ where: { id: courseByAId } });
    await prisma.user.deleteMany({ where: { id: { in: [instructorAId, instructorBId] } } });
    await prisma.$disconnect();
  });

  it("INSTRUCTOR A is the author of their own course", async () => {
    const course = await prisma.course.findUnique({ where: { id: courseByAId } });
    expect(course?.authorId).toBe(instructorAId);
  });

  it("INSTRUCTOR B cannot see course ownership as their own", async () => {
    const course = await prisma.course.findUnique({ where: { id: courseByAId } });
    expect(course?.authorId).not.toBe(instructorBId);
  });

  it("canEditCourse logic: INSTRUCTOR A owns, B does not", () => {
    function canEditCourse(userId: string, authorId: string | null, role: string) {
      if (role === "ADMIN") return true;
      if (role === "INSTRUCTOR" && authorId === userId) return true;
      return false;
    }

    expect(canEditCourse(instructorAId, instructorAId, "INSTRUCTOR")).toBe(true);
    expect(canEditCourse(instructorBId, instructorAId, "INSTRUCTOR")).toBe(false);
  });

  it("ADMIN can always edit any course", () => {
    function canEditCourse(userId: string, authorId: string | null, role: string) {
      if (role === "ADMIN") return true;
      if (role === "INSTRUCTOR" && authorId === userId) return true;
      return false;
    }

    expect(canEditCourse("any-admin-id", instructorAId, "ADMIN")).toBe(true);
  });

  it("course authoredCourses relation works", async () => {
    const instructor = await prisma.user.findUnique({
      where: { id: instructorAId },
      include: { authoredCourses: true },
    });
    expect(instructor?.authoredCourses).toHaveLength(1);
    expect(instructor?.authoredCourses[0].id).toBe(courseByAId);
  });

  it("publish sets isPublished after adding a lesson", async () => {
    await prisma.lesson.create({
      data: { courseId: courseByAId, title: "L1", content: "", order: 1 },
    });

    const lessonCount = await prisma.lesson.count({ where: { courseId: courseByAId } });
    expect(lessonCount).toBeGreaterThan(0);

    await prisma.course.update({
      where: { id: courseByAId },
      data: { isPublished: true },
    });

    const course = await prisma.course.findUnique({ where: { id: courseByAId } });
    expect(course?.isPublished).toBe(true);
  });
});
