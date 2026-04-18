"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function submitAssignment(
  assignmentId: number,
  files: { fileKey: string; fileName: string; fileSize: number; mimeType: string }[]
) {
  const user = await requireRole("STUDENT");

  const submission = await prisma.submission.create({
    data: {
      assignmentId,
      studentId: user.id,
      status: "SUBMITTED",
      files: {
        create: files.map((f) => ({
          fileName: f.fileName,
          fileKey: f.fileKey,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
        })),
      },
    },
    include: { assignment: { include: { lesson: true } } },
  });

  // Notify CAM mentor
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mentorId: true, fullName: true },
  });

  if (student?.mentorId) {
    await prisma.notification.create({
      data: {
        userId: student.mentorId,
        type: "FEEDBACK_RECEIVED",
        title: "งานใหม่รอตรวจ",
        message: `${student.fullName} ส่งงาน "${submission.assignment.title}"`,
        link: `/review/${submission.id}`,
      },
    });
  }

  revalidatePath(`/courses`);
  return submission.id;
}
