import { describe, it, expect } from "vitest";

type UserRole = "STUDENT" | "MENTOR" | "INSTRUCTOR" | "ADMIN";

type Submission = {
  studentId: string;
  student: { mentorId: string | null };
  assignment: { lesson: { course: { authorId: string | null } } };
};

function canAccessSubmissionFile(
  userId: string,
  role: UserRole,
  submission: Submission
): boolean {
  if (role === "ADMIN") return true;
  if (submission.studentId === userId) return true;
  if (submission.student.mentorId === userId) return true;
  if (submission.assignment.lesson.course.authorId === userId) return true;
  return false;
}

describe("canAccessSubmissionFile", () => {
  const sub: Submission = {
    studentId: "student-1",
    student: { mentorId: "mentor-1" },
    assignment: { lesson: { course: { authorId: "instructor-1" } } },
  };

  it("ADMIN can access any submission file", () => {
    expect(canAccessSubmissionFile("someone", "ADMIN", sub)).toBe(true);
  });

  it("owner student can access their own file", () => {
    expect(canAccessSubmissionFile("student-1", "STUDENT", sub)).toBe(true);
  });

  it("other student cannot access", () => {
    expect(canAccessSubmissionFile("student-2", "STUDENT", sub)).toBe(false);
  });

  it("paired mentor can access", () => {
    expect(canAccessSubmissionFile("mentor-1", "MENTOR", sub)).toBe(true);
  });

  it("unpaired mentor cannot access", () => {
    expect(canAccessSubmissionFile("mentor-2", "MENTOR", sub)).toBe(false);
  });

  it("course author (INSTRUCTOR) can access", () => {
    expect(canAccessSubmissionFile("instructor-1", "INSTRUCTOR", sub)).toBe(true);
  });

  it("different instructor cannot access", () => {
    expect(canAccessSubmissionFile("instructor-2", "INSTRUCTOR", sub)).toBe(false);
  });

  it("student with no mentor: nobody else accesses", () => {
    const subNoMentor: Submission = {
      studentId: "student-1",
      student: { mentorId: null },
      assignment: { lesson: { course: { authorId: "instructor-1" } } },
    };
    expect(canAccessSubmissionFile("mentor-1", "MENTOR", subNoMentor)).toBe(false);
    expect(canAccessSubmissionFile("instructor-1", "INSTRUCTOR", subNoMentor)).toBe(true);
  });
});
