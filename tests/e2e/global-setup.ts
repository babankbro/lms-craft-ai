/**
 * Playwright globalSetup — seeds test-specific E2E data before specs run.
 * Sets process.env vars read by the spec files.
 * Requires DATABASE_URL (read from .env automatically by Prisma).
 */
import { PrismaClient } from "@prisma/client";

export default async function globalSetup() {
  const prisma = new PrismaClient();

  try {
    // ── Look up seed users ──────────────────────────────────────────────────
    const student1 = await prisma.user.findUniqueOrThrow({
      where: { email: "student1@school.ac.th" },
    });
    const instructor = await prisma.user.findUniqueOrThrow({
      where: { email: "instructor@ksu.ac.th" },
    });

    // ── Find or create a course ─────────────────────────────────────────────
    let course = await prisma.course.findFirst({
      where: { authorId: instructor.id },
    });
    if (!course) {
      course = await prisma.course.create({
        data: {
          title: "E2E Test Course",
          slug: "e2e-test-course",
          authorId: instructor.id,
        },
      });
    }

    // ── Find or create a lesson ─────────────────────────────────────────────
    let lesson = await prisma.lesson.findFirst({ where: { courseId: course.id } });
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: { courseId: course.id, title: "E2E Test Lesson", content: "", order: 1 },
      });
    }

    // ── Find or create an assignment ────────────────────────────────────────
    let assignment = await prisma.assignment.findFirst({ where: { lessonId: lesson.id } });
    if (!assignment) {
      assignment = await prisma.assignment.create({
        data: { lessonId: lesson.id, title: "E2E Test Assignment", description: "Test" },
      });
    }

    // ── Enrol student1 (APPROVED) ───────────────────────────────────────────
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: student1.id, courseId: course.id } },
      update: { status: "APPROVED" },
      create: { userId: student1.id, courseId: course.id, status: "APPROVED" },
    });

    // ── Create AssignmentAttachment (STUDENT_AFTER_APPROVED) ────────────────
    const exampleFileKey = `assignments/${assignment.id}/example/e2e-sample.pdf`;
    const existingAttachment = await prisma.assignmentAttachment.findFirst({
      where: { fileKey: exampleFileKey },
    });
    if (!existingAttachment) {
      await prisma.assignmentAttachment.create({
        data: {
          assignmentId: assignment.id,
          kind: "EXAMPLE",
          fileName: "e2e-sample.pdf",
          fileKey: exampleFileKey,
          fileSize: 1024,
          mimeType: "application/pdf",
          uploadedById: instructor.id,
          visibility: "STUDENT_AFTER_APPROVED",
        },
      });
    }

    // ── Create a Submission for student1 (status = SUBMITTED) ───────────────
    let submission = await prisma.submission.findFirst({
      where: { studentId: student1.id, assignmentId: assignment.id },
    });
    if (!submission) {
      submission = await prisma.submission.create({
        data: { studentId: student1.id, assignmentId: assignment.id, status: "SUBMITTED" },
      });
    } else {
      submission = await prisma.submission.update({
        where: { id: submission.id },
        data: { status: "SUBMITTED" },
      });
    }

    // ── Create a SubmissionFile so the submission has a file key ─────────────
    const submissionFileKey = `submissions/${submission.id}/e2e-test-file.pdf`;
    const existingFile = await prisma.submissionFile.findFirst({
      where: { submissionId: submission.id, fileKey: submissionFileKey },
    });
    if (!existingFile) {
      await prisma.submissionFile.create({
        data: {
          submissionId: submission.id,
          fileKey: submissionFileKey,
          fileName: "e2e-test-file.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
        },
      });
    }

    // ── Export env vars for specs ───────────────────────────────────────────
    process.env.E2E_SUBMISSION_FILE_KEY = submissionFileKey;
    process.env.E2E_EXAMPLE_FILE_KEY = exampleFileKey;
    process.env.E2E_SUBMISSION_ID = String(submission.id);

    console.log("[globalSetup] E2E test data ready:");
    console.log("  E2E_SUBMISSION_FILE_KEY =", submissionFileKey);
    console.log("  E2E_EXAMPLE_FILE_KEY    =", exampleFileKey);
    console.log("  E2E_SUBMISSION_ID       =", submission.id);
  } finally {
    await prisma.$disconnect();
  }
}
