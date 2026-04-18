"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, canAuthor } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAssignmentAuthor(assignmentId: number) {
  const user = await requireAuth();
  if (!canAuthor(user.role)) throw new Error("Forbidden");
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      lesson: { include: { course: { select: { authorId: true, id: true } } } },
      course: { select: { authorId: true, id: true } },
    },
  });
  if (!assignment) throw new Error("Assignment not found");
  const authorId = assignment.lesson?.course.authorId ?? assignment.course?.authorId;
  if (user.role !== "ADMIN" && authorId !== user.id) {
    throw new Error("Forbidden: not course author");
  }
  return { user, assignment };
}

const attachSchema = z.object({
  kind: z.enum(["PROMPT", "GUIDE", "EXAMPLE"]),
  visibility: z.enum(["STUDENT_ANYTIME", "STUDENT_AFTER_SUBMIT", "STUDENT_AFTER_APPROVED", "INTERNAL_ONLY"]),
  fileName: z.string().min(1),
  fileKey: z.string().min(1),
  fileSize: z.coerce.number().int().positive(),
  mimeType: z.string().min(1),
});

export async function createAssignmentAttachment(
  assignmentId: number,
  courseId: number,
  formData: FormData
) {
  const { user } = await requireAssignmentAuthor(assignmentId);

  const data = attachSchema.parse({
    kind: formData.get("kind"),
    visibility: formData.get("visibility"),
    fileName: formData.get("fileName"),
    fileKey: formData.get("fileKey"),
    fileSize: formData.get("fileSize"),
    mimeType: formData.get("mimeType"),
  });

  await prisma.assignmentAttachment.create({
    data: {
      assignmentId,
      uploadedById: user.id,
      ...data,
    },
  });

  revalidatePath(`/teach/${courseId}/assignments/${assignmentId}`);
}

export async function deleteAssignmentAttachment(
  attachmentId: number,
  assignmentId: number,
  courseId: number
) {
  await requireAssignmentAuthor(assignmentId);

  await prisma.assignmentAttachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/teach/${courseId}/assignments/${assignmentId}`);
}
