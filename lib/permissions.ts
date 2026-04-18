import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  fullName: string;
  role: UserRole;
  groupName?: string | null;
};

export const ROLE = {
  STUDENT: "STUDENT",
  MENTOR: "MENTOR",
  INSTRUCTOR: "INSTRUCTOR",
  ADMIN: "ADMIN",
} as const satisfies Record<UserRole, UserRole>;

export async function requireAuth(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  // Verify user still exists in DB (stale JWT after DB reset causes FK violations)
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!dbUser) {
    redirect("/login");
  }
  return session.user as SessionUser;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export function canReview(role: UserRole): boolean {
  return role === "MENTOR" || role === "INSTRUCTOR" || role === "ADMIN";
}

export function canAuthor(role: UserRole): boolean {
  return role === "INSTRUCTOR" || role === "ADMIN";
}

export function canManage(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canLearn(_role: UserRole): boolean {
  return true; // all roles may enroll/watch
}

export class ForbiddenError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireOwnStudent(mentorId: string, studentId: string): Promise<void> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { mentorId: true },
  });
  if (!student || student.mentorId !== mentorId) {
    throw new ForbiddenError(`Mentor ${mentorId} is not paired with student ${studentId}`);
  }
}

export async function canAccessSubmission(
  viewer: { id: string; role: UserRole },
  submissionId: number
): Promise<boolean> {
  if (viewer.role === "ADMIN") return true;

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
  if (submission.studentId === viewer.id) return true;
  if (submission.student.mentorId === viewer.id) return true;
  const courseAuthorId = submission.assignment.lesson?.course.authorId ?? submission.assignment.course?.authorId;
  if (courseAuthorId === viewer.id) return true;
  return false;
}

export async function canAccessStudent(
  viewer: SessionUser,
  studentId: string
): Promise<boolean> {
  if (viewer.role === "ADMIN" || viewer.role === "INSTRUCTOR") return true;
  if (viewer.role === "MENTOR") {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { mentorId: true },
    });
    return student?.mentorId === viewer.id;
  }
  return viewer.id === studentId;
}
