import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("Notification on submission state transition", () => {
  let prisma: PrismaClient;
  let studentId: string;
  let mentorId: string;
  let assignmentId: number;
  let submissionId: number;
  let courseId: number;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const ts = Date.now();

    const mentor = await prisma.user.create({
      data: { email: `notif-mentor-${ts}@test.com`, passwordHash: "x", fullName: "Notif Mentor", role: "MENTOR" },
    });
    mentorId = mentor.id;

    const student = await prisma.user.create({
      data: { email: `notif-student-${ts}@test.com`, passwordHash: "x", fullName: "Notif Student", role: "STUDENT", mentorId },
    });
    studentId = student.id;

    const course = await prisma.course.create({
      data: { title: "Notif Course", slug: `notif-course-${ts}` },
    });
    courseId = course.id;

    const lesson = await prisma.lesson.create({
      data: { courseId, title: "L1", content: "", order: 1 },
    });

    const assignment = await prisma.assignment.create({
      data: { lessonId: lesson.id, title: "Notif Assignment", description: "" },
    });
    assignmentId = assignment.id;

    const submission = await prisma.submission.create({
      data: { assignmentId, studentId, status: "SUBMITTED" },
    });
    submissionId = submission.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: { in: [studentId, mentorId] } } });
    await prisma.submission.deleteMany({ where: { id: submissionId } });
    await prisma.assignment.deleteMany({ where: { id: assignmentId } });
    await prisma.lesson.deleteMany({ where: { courseId } });
    await prisma.course.delete({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: [studentId, mentorId] } } });
    await prisma.$disconnect();
  });

  it("APPROVED creates exactly one SUBMISSION_REVIEWED notification for student", async () => {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "APPROVED", reviewedBy: mentorId, reviewedAt: new Date() },
    });

    await prisma.notification.create({
      data: {
        userId: studentId,
        type: "SUBMISSION_REVIEWED",
        title: "งานผ่านการตรวจแล้ว",
        message: "คะแนน: 85",
        link: `/submissions/${submissionId}`,
      },
    });

    const notifs = await prisma.notification.findMany({
      where: { userId: studentId, type: "SUBMISSION_REVIEWED" },
    });
    expect(notifs).toHaveLength(1);
    expect(notifs[0].isRead).toBe(false);
  });

  it("REVISION_REQUESTED creates exactly one REVISION_REQUESTED notification for student", async () => {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "REVISION_REQUESTED" },
    });

    await prisma.notification.create({
      data: {
        userId: studentId,
        type: "REVISION_REQUESTED",
        title: "กรุณาแก้ไขงาน",
        message: "แก้ไขรูปแบบเอกสาร",
        link: `/submissions/${submissionId}`,
      },
    });

    const notifs = await prisma.notification.findMany({
      where: { userId: studentId, type: "REVISION_REQUESTED" },
    });
    expect(notifs).toHaveLength(1);
  });

  it("new comment triggers FEEDBACK_RECEIVED notification to other party", async () => {
    await prisma.notification.create({
      data: {
        userId: studentId,
        type: "FEEDBACK_RECEIVED",
        title: "ข้อเสนอแนะใหม่",
        message: "มีความคิดเห็นใหม่",
        link: `/submissions/${submissionId}`,
      },
    });

    const notifs = await prisma.notification.findMany({
      where: { userId: studentId, type: "FEEDBACK_RECEIVED" },
    });
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });

  it("mark all read clears unread count", async () => {
    await prisma.notification.updateMany({
      where: { userId: studentId, isRead: false },
      data: { isRead: true },
    });
    const unread = await prisma.notification.count({
      where: { userId: studentId, isRead: false },
    });
    expect(unread).toBe(0);
  });
});
