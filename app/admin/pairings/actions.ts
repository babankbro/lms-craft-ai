"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function createPairing(formData: FormData) {
  await requireRole("ADMIN");
  const mentorId = formData.get("mentorId") as string;
  const studentId = formData.get("studentId") as string;
  if (!mentorId || !studentId) throw new Error("Missing mentorId or studentId");

  await prisma.user.update({
    where: { id: studentId },
    data: { mentorId },
  });
  revalidatePath("/admin/pairings");
}

export async function removePairing(studentId: string) {
  await requireRole("ADMIN");
  await prisma.user.update({
    where: { id: studentId },
    data: { mentorId: null },
  });
  revalidatePath("/admin/pairings");
}
