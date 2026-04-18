"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { NotificationType } from "@prisma/client";

export async function approveEnrollment(enrollmentId: number) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");

  const enrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    include: { course: { select: { authorId: true, title: true, slug: true, id: true } } },
  });

  if (user.role === "INSTRUCTOR" && enrollment.course.authorId !== user.id) {
    throw new Error("Forbidden: not your course");
  }
  if (enrollment.status !== "PENDING") throw new Error("Enrollment is not pending");

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: user.id },
  });

  await prisma.notification.create({
    data: {
      userId: enrollment.userId,
      type: "ENROLLMENT_APPROVED" as NotificationType,
      title: "คำขอลงทะเบียนได้รับการอนุมัติ",
      message: `คุณได้รับการอนุมัติให้เรียนหลักสูตร "${enrollment.course.title}"`,
      link: `/courses/${enrollment.course.slug}`,
    },
  });

  revalidatePath(`/teach/${enrollment.courseId}/enrollments`);
  revalidatePath(`/admin/enrollments`);
}

export async function rejectEnrollment(enrollmentId: number, reason: string) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");

  const enrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    include: { course: { select: { authorId: true, title: true, slug: true, id: true } } },
  });

  if (user.role === "INSTRUCTOR" && enrollment.course.authorId !== user.id) {
    throw new Error("Forbidden: not your course");
  }
  if (enrollment.status !== "PENDING") throw new Error("Enrollment is not pending");

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: user.id,
      rejectReason: reason || null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: enrollment.userId,
      type: "ENROLLMENT_REJECTED" as NotificationType,
      title: "คำขอลงทะเบียนถูกปฏิเสธ",
      message: reason
        ? `คำขอเรียนหลักสูตร "${enrollment.course.title}" ถูกปฏิเสธ: ${reason}`
        : `คำขอเรียนหลักสูตร "${enrollment.course.title}" ถูกปฏิเสธ`,
      link: `/courses/${enrollment.course.slug}`,
    },
  });

  revalidatePath(`/teach/${enrollment.courseId}/enrollments`);
  revalidatePath(`/admin/enrollments`);
}

export async function rejectEnrollmentWithReason(enrollmentId: number, formData: FormData) {
  const reason = formData.get("reason") as string;
  await rejectEnrollment(enrollmentId, reason);
}

export async function bulkApproveEnrollments(enrollmentIds: number[]) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");

  const enrollments = await prisma.enrollment.findMany({
    where: { id: { in: enrollmentIds } },
    include: { course: { select: { authorId: true, title: true, slug: true, id: true } } },
  });

  const pending = enrollments.filter((e) => {
    if (e.status !== "PENDING") return false;
    if (user.role === "INSTRUCTOR" && e.course.authorId !== user.id) return false;
    return true;
  });

  if (pending.length === 0) return;

  await Promise.all(
    pending.map((e) =>
      prisma.enrollment.update({
        where: { id: e.id },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: user.id },
      })
    )
  );

  await prisma.notification.createMany({
    data: pending.map((e) => ({
      userId: e.userId,
      type: "ENROLLMENT_APPROVED" as NotificationType,
      title: "คำขอลงทะเบียนได้รับการอนุมัติ",
      message: `คุณได้รับการอนุมัติให้เรียนหลักสูตร "${e.course.title}"`,
      link: `/courses/${e.course.slug}`,
    })),
    skipDuplicates: true,
  });

  const courseIds = [...new Set(pending.map((e) => e.courseId))];
  for (const cid of courseIds) revalidatePath(`/teach/${cid}/enrollments`);
  revalidatePath(`/admin/enrollments`);
}

export async function bulkRejectEnrollments(enrollmentIds: number[], reason: string) {
  const user = await requireRole("INSTRUCTOR", "ADMIN");

  const enrollments = await prisma.enrollment.findMany({
    where: { id: { in: enrollmentIds } },
    include: { course: { select: { authorId: true, title: true, slug: true, id: true } } },
  });

  const pending = enrollments.filter((e) => {
    if (e.status !== "PENDING") return false;
    if (user.role === "INSTRUCTOR" && e.course.authorId !== user.id) return false;
    return true;
  });

  if (pending.length === 0) return;

  await Promise.all(
    pending.map((e) =>
      prisma.enrollment.update({
        where: { id: e.id },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedById: user.id,
          rejectReason: reason || null,
        },
      })
    )
  );

  await prisma.notification.createMany({
    data: pending.map((e) => ({
      userId: e.userId,
      type: "ENROLLMENT_REJECTED" as NotificationType,
      title: "คำขอลงทะเบียนถูกปฏิเสธ",
      message: reason
        ? `คำขอเรียนหลักสูตร "${e.course.title}" ถูกปฏิเสธ: ${reason}`
        : `คำขอเรียนหลักสูตร "${e.course.title}" ถูกปฏิเสธ`,
      link: `/courses/${e.course.slug}`,
    })),
    skipDuplicates: true,
  });

  const courseIds = [...new Set(pending.map((e) => e.courseId))];
  for (const cid of courseIds) revalidatePath(`/teach/${cid}/enrollments`);
  revalidatePath(`/admin/enrollments`);
}

export async function revokeEnrollment(enrollmentId: number) {
  await requireRole("ADMIN");

  const enrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    include: { course: { select: { title: true, slug: true } } },
  });
  if (enrollment.status !== "APPROVED") throw new Error("Enrollment is not approved");

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: "REJECTED", reviewedAt: new Date() },
  });

  revalidatePath(`/admin/enrollments`);
}
