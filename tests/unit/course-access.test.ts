import { describe, it, expect } from "vitest";

type UserRole = "STUDENT" | "MENTOR" | "INSTRUCTOR" | "ADMIN";

type SessionUser = { id: string; role: UserRole };
type Course = { authorId: string | null };

function canEditCourse(user: SessionUser, course: Course): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "INSTRUCTOR" && course.authorId === user.id) return true;
  return false;
}

describe("canEditCourse", () => {
  const instructorA: SessionUser = { id: "user-A", role: "INSTRUCTOR" };
  const instructorB: SessionUser = { id: "user-B", role: "INSTRUCTOR" };
  const admin: SessionUser = { id: "user-admin", role: "ADMIN" };
  const mentor: SessionUser = { id: "user-mentor", role: "MENTOR" };
  const student: SessionUser = { id: "user-student", role: "STUDENT" };

  const courseByA: Course = { authorId: "user-A" };
  const courseByB: Course = { authorId: "user-B" };
  const unownedCourse: Course = { authorId: null };

  it("INSTRUCTOR can edit their own course", () => {
    expect(canEditCourse(instructorA, courseByA)).toBe(true);
  });

  it("INSTRUCTOR cannot edit another INSTRUCTOR's course", () => {
    expect(canEditCourse(instructorA, courseByB)).toBe(false);
  });

  it("ADMIN can edit any course", () => {
    expect(canEditCourse(admin, courseByA)).toBe(true);
    expect(canEditCourse(admin, courseByB)).toBe(true);
    expect(canEditCourse(admin, unownedCourse)).toBe(true);
  });

  it("MENTOR cannot edit any course", () => {
    expect(canEditCourse(mentor, courseByA)).toBe(false);
    expect(canEditCourse(mentor, unownedCourse)).toBe(false);
  });

  it("STUDENT cannot edit any course", () => {
    expect(canEditCourse(student, courseByA)).toBe(false);
  });

  it("INSTRUCTOR cannot edit course with no author", () => {
    expect(canEditCourse(instructorA, unownedCourse)).toBe(false);
  });
});
