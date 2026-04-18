import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Submission workflow integration", () => {
  let prisma: PrismaClient;
  let courseId: number;
  let lessonId: number;
  let assignmentId: number;
  let studentUserId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const student = await prisma.user.findFirst({ where: { role: "STUDENT" } });
    studentUserId = student!.id;

    const course = await prisma.course.create({
      data: {
        title: "Submission Test",
        slug: "test-submission-flow",
        lessons: {
          create: [{ title: "Lesson 1", content: "", order: 1 }],
        },
      },
      include: { lessons: true },
    });
    courseId = course.id;
    lessonId = course.lessons[0].id;

    const assignment = await prisma.assignment.create({
      data: { lessonId, title: "Test Assignment", description: "Upload a PDF" },
    });
    assignmentId = assignment.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({});
    await prisma.submissionComment.deleteMany({});
    await prisma.submissionFile.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.assignment.deleteMany({});
    await prisma.lesson.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } });
    await prisma.$disconnect();
  });

  it("creates submission with files", async () => {
    const sub = await prisma.submission.create({
      data: {
        assignmentId,
        studentId: studentUserId,
        status: "SUBMITTED",
        files: {
          create: [
            {
              fileName: "report.pdf",
              fileKey: "submissions/test/report.pdf",
              fileSize: 1024,
              mimeType: "application/pdf",
            },
          ],
        },
      },
      include: { files: true },
    });

    expect(sub.files).toHaveLength(1);
    expect(sub.status).toBe("SUBMITTED");
  });

  it("updates submission status to APPROVED with score", async () => {
    const sub = await prisma.submission.findFirst({
      where: { assignmentId, studentId: studentUserId },
    });

    const updated = await prisma.submission.update({
      where: { id: sub!.id },
      data: {
        status: "APPROVED",
        score: 85,
        maxScore: 100,
        reviewedAt: new Date(),
      },
    });

    expect(updated.status).toBe("APPROVED");
    expect(updated.score).toBe(85);
  });

  it("adds comment to submission", async () => {
    const sub = await prisma.submission.findFirst({
      where: { assignmentId, studentId: studentUserId },
    });

    const comment = await prisma.submissionComment.create({
      data: {
        submissionId: sub!.id,
        authorId: studentUserId,
        content: "Please review my work",
      },
    });

    expect(comment.content).toBe("Please review my work");
  });

  it("creates notification on review", async () => {
    const notif = await prisma.notification.create({
      data: {
        userId: studentUserId,
        type: "SUBMISSION_REVIEWED",
        title: "งานผ่านการตรวจแล้ว",
        message: "คะแนน: 85/100",
        link: "/courses",
      },
    });

    expect(notif.isRead).toBe(false);

    const unread = await prisma.notification.count({
      where: { userId: studentUserId, isRead: false },
    });
    expect(unread).toBeGreaterThanOrEqual(1);
  });
});
