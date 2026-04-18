import { prisma } from "@/lib/prisma";

/**
 * Single source of truth for file-access decisions.
 * Used by both /api/files/[...key] and /api/files/preview/[...key].
 * Returns true if the viewer is allowed to access the file at fileKey.
 */
export async function resolveFileAccess(
  fileKey: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") return true;

  // ── submissions/* ──────────────────────────────────────────────────────────
  const submissionMatch = fileKey.match(/^submissions\/(\d+)\//);
  if (submissionMatch) {
    const submissionId = parseInt(submissionMatch[1]);
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { mentorId: true } },
        assignment: {
          include: {
            lesson: { include: { course: { select: { authorId: true } } } },
            course: { select: { authorId: true } },
          },
        },
      },
    });
    if (!submission) return false;
    if (submission.studentId === userId) return true;
    if (submission.student.mentorId === userId) return true;
    const courseAuthorId = submission.assignment.lesson?.course.authorId ?? submission.assignment.course?.authorId;
    if (courseAuthorId === userId) return true;
    return false;
  }

  // ── lessons/* ──────────────────────────────────────────────────────────────
  const lessonMatch = fileKey.match(/^lessons\/(\d+)\//);
  if (lessonMatch) {
    if (userRole === "INSTRUCTOR" || userRole === "MENTOR") return true;
    const lessonId = parseInt(lessonMatch[1]);
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
    if (!lesson) return false;
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.courseId } },
    });
    return enrollment?.status === "APPROVED";
  }

  // ── assignments/* — AttachmentVisibility ───────────────────────────────────
  const assignMatch = fileKey.match(/^assignments\/(\d+)\//);
  if (assignMatch) {
    if (userRole === "INSTRUCTOR" || userRole === "MENTOR") return true;
    const assignmentId = parseInt(assignMatch[1]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attachment = await (prisma as any).assignmentAttachment.findFirst({
      where: { fileKey },
      select: { visibility: true, assignmentId: true },
    });
    if (!attachment) return false;
    if (attachment.visibility === "INTERNAL_ONLY") return false;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { lesson: { select: { courseId: true } }, course: { select: { id: true } } },
    });
    if (!assignment) return false;

    const courseId = assignment.lesson?.courseId ?? assignment.course?.id;
    if (!courseId) return false;
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment || enrollment.status !== "APPROVED") return false;

    if (attachment.visibility === "STUDENT_ANYTIME") return true;

    const submission = await prisma.submission.findFirst({
      where: { assignmentId, studentId: userId },
      orderBy: { updatedAt: "desc" },
      select: { status: true },
    });
    if (!submission) return false;
    if (attachment.visibility === "STUDENT_AFTER_SUBMIT") {
      return ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED", "APPROVED", "REJECTED"].includes(
        submission.status
      );
    }
    if (attachment.visibility === "STUDENT_AFTER_APPROVED") {
      return submission.status === "APPROVED";
    }
    return false;
  }

  // ── covers/* — any authenticated user ─────────────────────────────────────
  if (fileKey.startsWith("covers/") || fileKey.startsWith("public/")) return true;

  // ── certificates/* — owner only ────────────────────────────────────────────
  if (fileKey.startsWith("certificates/")) {
    const cert = await prisma.certificate.findFirst({
      where: { fileKey },
      select: { userId: true },
    });
    return cert?.userId === userId;
  }

  // ── videos/* — uploader or reviewer ───────────────────────────────────────
  const videoMatch = fileKey.match(/^videos\/([^/]+)\//);
  if (videoMatch) {
    if (userRole === "INSTRUCTOR" || userRole === "MENTOR") return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const video = await (prisma as any).observationVideo.findUnique({
      where: { id: videoMatch[1] }, // String (cuid) — not parseInt
      select: { uploaderId: true },
    });
    if (!video) return false;
    return video.uploaderId === userId;
  }

  return false;
}
