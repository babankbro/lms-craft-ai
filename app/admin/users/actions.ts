"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["STUDENT", "MENTOR", "INSTRUCTOR", "ADMIN"]),
  groupName: z.string().optional(),
});

export async function createUser(formData: FormData) {
  await requireRole("ADMIN");

  const data = CreateUserSchema.parse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    groupName: formData.get("groupName") || undefined,
  });

  const defaultPassword = "changeme123";
  const hash = await bcrypt.hash(defaultPassword, 10);

  await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hash,
      fullName: data.fullName,
      role: data.role,
      groupName: data.groupName,
    },
  });

  revalidatePath("/admin/users");
}

export async function toggleUserActive(userId: string) {
  await requireRole("ADMIN");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { isActive: true } });
  await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
  revalidatePath("/admin/users");
}

export async function changeUserRole(userId: string, role: string) {
  await requireRole("ADMIN");
  const validRoles = ["STUDENT", "MENTOR", "INSTRUCTOR", "ADMIN"] as const;
  if (!validRoles.includes(role as typeof validRoles[number])) throw new Error("Invalid role");
  await prisma.user.update({ where: { id: userId }, data: { role: role as typeof validRoles[number] } });
  revalidatePath("/admin/users");
}

export async function assignMentor(studentId: string, mentorId: string | null) {
  await requireRole("ADMIN");

  await prisma.user.update({
    where: { id: studentId },
    data: { mentorId },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/pairings");
}

const VALID_ROLES = ["STUDENT", "MENTOR", "INSTRUCTOR", "ADMIN"] as const;
type ValidRole = typeof VALID_ROLES[number];

export async function importUsersCSV(formData: FormData) {
  await requireRole("ADMIN");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // Accept both old school_name and new group_name header (deprecation warning for old)
  const groupNameIdx = header.indexOf("group_name");
  const schoolNameIdx = header.indexOf("school_name");
  if (schoolNameIdx !== -1 && groupNameIdx === -1) {
    console.warn("CSV import: 'school_name' column is deprecated. Please use 'group_name' instead.");
  }
  const groupColIdx = groupNameIdx !== -1 ? groupNameIdx : schoolNameIdx;

  const results = { created: 0, skipped: 0, errors: [] as string[] };
  const defaultHash = await bcrypt.hash("changeme123", 10);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    try {
      const email = cols[header.indexOf("email")];
      const fullName = cols[header.indexOf("full_name")];
      const role = cols[header.indexOf("role")]?.toUpperCase();
      const groupName = groupColIdx !== -1 ? cols[groupColIdx] || null : null;

      if (!email || !fullName || !(VALID_ROLES as readonly string[]).includes(role)) {
        results.errors.push(`Row ${i + 1}: Invalid data (unknown role '${role}')`);
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        results.skipped++;
        continue;
      }

      await prisma.user.create({
        data: {
          email,
          passwordHash: defaultHash,
          fullName,
          role: role as ValidRole,
          groupName,
        },
      });
      results.created++;
    } catch (err) {
      results.errors.push(`Row ${i + 1}: ${(err as Error).message}`);
    }
  }

  revalidatePath("/admin/users");
  // Results are logged server-side; client shows revalidated list
  if (results.errors.length > 0) {
    console.error("CSV import errors:", results.errors);
  }
  console.log(
    `CSV import: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`
  );
}
