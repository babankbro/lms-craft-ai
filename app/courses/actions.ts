"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireAuth } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { NotificationType } from "@prisma/client";
import { enqueueEmail } from "@/lib/mailer";
import { maybeIssueCertificate } from "@/lib/certificate";

export async function enrollInCourse(courseId: number) {
  const user = await requireRole("STUDENT");

  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } });
  if (!course.isPublished) throw new Error("NOT_PUBLISHED");

  const newStatus = course.requiresApproval ? "PENDING" : "APPROVED";

  // Upsert: reactivate REJECTED/CANCELLED rows
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });

  if (existing) {
    if (existing.status === "PENDING" || existing.status === "APPROVED") return;
    await prisma.enrollment.update({
      where: { id: existing.id },
      data: { status: newStatus, requestedAt: new Date(), reviewedAt: null, reviewedById: null, rejectReason: null },
    });
  } else {
    await prisma.enrollment.create({
      data: { userId: user.id, courseId, status: newStatus },
    });
  }

  if (newStatus === "PENDING") {
    // Notify instructors + admins
    const recipients = await prisma.user.findMany({
      where: { role: { in: ["INSTRUCTOR", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        type: "ENROLLMENT_REQUESTED" as NotificationType,
        title: "คำขอลงทะเบียนใหม่",
        message: `${user.fullName} ขอลงทะเบียนหลักสูตร "${course.title}"`,
        link: `/teach/${courseId}/enrollments`,
      })),
      skipDuplicates: true,
    });

    // Enqueue email to each recipient
    await Promise.all(
      recipients.map((r) =>
        enqueueEmail(r.id, "ENROLLMENT_REQUESTED", {
          studentName: user.fullName,
          courseName: course.title,
          link: `/teach/${courseId}/enrollments`,
        })
      )
    );
  }

  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath(`/courses/${course.slug}`);
}

export async function cancelEnrollment(courseId: number) {
  const user = await requireRole("STUDENT");

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (!enrollment || enrollment.status !== "PENDING") throw new Error("No pending enrollment to cancel");

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: "CANCELLED" },
  });

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { slug: true } });
  revalidatePath("/courses");
  revalidatePath(`/courses/${course?.slug}`);
}

export async function markLessonComplete(lessonId: number) {
  const user = await requireAuth();

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { isCompleted: true, completedAt: new Date() },
    create: {
      userId: user.id,
      lessonId,
      isCompleted: true,
      completedAt: new Date(),
    },
  });

  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { courseId: true },
  });
  maybeIssueCertificate(user.id, lesson.courseId).catch(() => {});

  revalidatePath("/courses");
}

export async function requestCertificate(courseId: number) {
  const user = await requireAuth();
  await maybeIssueCertificate(user.id, courseId);
  revalidatePath("/courses");
}

export async function getCourseProgress(userId: string, courseId: number) {
  const totalLessons = await prisma.lesson.count({ where: { courseId } });
  if (totalLessons === 0) return 0;

  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      lesson: { courseId },
      isCompleted: true,
    },
  });

  return Math.round((completedLessons / totalLessons) * 100);
}
