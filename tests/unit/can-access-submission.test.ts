import { describe, it, expect, vi, beforeEach } from "vitest";
import { canAccessSubmission } from "@/lib/permissions";

// Mock prisma module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    submission: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockSubmission = (studentId: string, mentorId: string | null, courseAuthorId: string) => ({
  studentId,
  student: { mentorId },
  assignment: {
    lesson: {
      course: { authorId: courseAuthorId },
    },
  },
});

describe("canAccessSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true for the submission owner (student)", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      mockSubmission("student-1", "mentor-1", "instructor-1") as never
    );
    expect(await canAccessSubmission({ id: "student-1", role: "STUDENT" }, 42)).toBe(true);
  });

  it("returns true for the student's paired mentor", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      mockSubmission("student-1", "mentor-1", "instructor-1") as never
    );
    expect(await canAccessSubmission({ id: "mentor-1", role: "MENTOR" }, 42)).toBe(true);
  });

  it("returns false for an unpaired mentor", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      mockSubmission("student-1", "mentor-1", "instructor-1") as never
    );
    expect(await canAccessSubmission({ id: "mentor-OTHER", role: "MENTOR" }, 42)).toBe(false);
  });

  it("returns false for a different student", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      mockSubmission("student-1", "mentor-1", "instructor-1") as never
    );
    expect(await canAccessSubmission({ id: "student-2", role: "STUDENT" }, 42)).toBe(false);
  });

  it("returns true for the course instructor (author)", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(
      mockSubmission("student-1", "mentor-1", "instructor-1") as never
    );
    expect(await canAccessSubmission({ id: "instructor-1", role: "INSTRUCTOR" }, 42)).toBe(true);
  });

  it("returns true for ADMIN regardless of ownership", async () => {
    // ADMIN check is short-circuit — no DB query needed
    expect(await canAccessSubmission({ id: "admin-1", role: "ADMIN" }, 42)).toBe(true);
    expect(prisma.submission.findUnique).not.toHaveBeenCalled();
  });

  it("returns false when submission does not exist", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null);
    expect(await canAccessSubmission({ id: "anyone", role: "MENTOR" }, 999)).toBe(false);
  });
});
