import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Review queue MENTOR scope", () => {
  let prisma: PrismaClient;
  let mentorAId: string;
  let mentorBId: string;
  let studentAId: string;
  let studentBId: string;
  let assignmentId: number;
  let subAId: number;
  let subBId: number;
  let courseId: number;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const ts = Date.now();

    const mentorA = await prisma.user.create({
      data: { email: `mentor-a-${ts}@test.com`, passwordHash: "x", fullName: "Mentor A", role: "MENTOR" },
    });
    mentorAId = mentorA.id;

    const mentorB = await prisma.user.create({
      data: { email: `mentor-b-${ts}@test.com`, passwordHash: "x", fullName: "Mentor B", role: "MENTOR" },
    });
    mentorBId = mentorB.id;

    const studentA = await prisma.user.create({
      data: { email: `student-a-${ts}@test.com`, passwordHash: "x", fullName: "Student A", role: "STUDENT", mentorId: mentorAId },
    });
    studentAId = studentA.id;

    const studentB = await prisma.user.create({
      data: { email: `student-b-${ts}@test.com`, passwordHash: "x", fullName: "Student B", role: "STUDENT", mentorId: mentorBId },
    });
    studentBId = studentB.id;

    const course = await prisma.course.create({
      data: { title: "RQ Test Course", slug: `rq-test-${ts}` },
    });
    courseId = course.id;

    const lesson = await prisma.lesson.create({
      data: { courseId, title: "L1", content: "", order: 1 },
    });

    const assignment = await prisma.assignment.create({
      data: { lessonId: lesson.id, title: "Assignment 1", description: "" },
    });
    assignmentId = assignment.id;

    const subA = await prisma.submission.create({
      data: { assignmentId, studentId: studentAId, status: "SUBMITTED" },
    });
    subAId = subA.id;

    const subB = await prisma.submission.create({
      data: { assignmentId, studentId: studentBId, status: "SUBMITTED" },
    });
    subBId = subB.id;
  });

  afterAll(async () => {
    await prisma.submission.deleteMany({ where: { id: { in: [subAId, subBId] } } });
    await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    await prisma.lesson.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: [mentorAId, mentorBId, studentAId, studentBId] } } });
    await prisma.$disconnect();
  });

  it("MENTOR A sees only their mentee's submission", async () => {
    const submissions = await prisma.submission.findMany({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
        student: { mentorId: mentorAId },
      },
    });
    expect(submissions.map((s) => s.id)).toContain(subAId);
    expect(submissions.map((s) => s.id)).not.toContain(subBId);
  });

  it("MENTOR B sees only their mentee's submission", async () => {
    const submissions = await prisma.submission.findMany({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
        student: { mentorId: mentorBId },
      },
    });
    expect(submissions.map((s) => s.id)).toContain(subBId);
    expect(submissions.map((s) => s.id)).not.toContain(subAId);
  });

  it("ADMIN sees all submissions", async () => {
    const submissions = await prisma.submission.findMany({
      where: { id: { in: [subAId, subBId] } },
    });
    expect(submissions).toHaveLength(2);
  });

  it("claim changes status to UNDER_REVIEW", async () => {
    await prisma.submission.update({
      where: { id: subAId },
      data: { status: "UNDER_REVIEW", reviewedBy: mentorAId },
    });
    const sub = await prisma.submission.findUnique({ where: { id: subAId } });
    expect(sub?.status).toBe("UNDER_REVIEW");
    expect(sub?.reviewedBy).toBe(mentorAId);
  });

  it("release changes status back to SUBMITTED", async () => {
    await prisma.submission.update({
      where: { id: subAId },
      data: { status: "SUBMITTED", reviewedBy: null },
    });
    const sub = await prisma.submission.findUnique({ where: { id: subAId } });
    expect(sub?.status).toBe("SUBMITTED");
    expect(sub?.reviewedBy).toBeNull();
  });
});
