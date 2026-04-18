import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveFileAccess } from "@/lib/attachment-visibility";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    submission: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    lesson: {
      findUnique: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
    },
    assignment: {
      findUnique: vi.fn(),
    },
    assignmentAttachment: {
      findFirst: vi.fn(),
    },
    certificate: {
      findFirst: vi.fn(),
    },
    observationVideo: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── submissions/* ─────────────────────────────────────────────────────────────

describe("resolveFileAccess — submissions/*", () => {
  const fileKey = "submissions/10/file.pdf";

  const mockSub = (studentId: string, mentorId: string | null, authorId: string) => ({
    studentId,
    student: { mentorId },
    assignment: { lesson: { course: { authorId } } },
  });

  it("ADMIN always passes", async () => {
    expect(await resolveFileAccess(fileKey, "admin-1", "ADMIN")).toBe(true);
    expect(prisma.submission.findUnique).not.toHaveBeenCalled();
  });

  it("owner (student) passes", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSub("stu-1", null, "inst-1") as never);
    expect(await resolveFileAccess(fileKey, "stu-1", "STUDENT")).toBe(true);
  });

  it("paired mentor passes", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSub("stu-1", "men-1", "inst-1") as never);
    expect(await resolveFileAccess(fileKey, "men-1", "MENTOR")).toBe(true);
  });

  it("unpaired mentor is denied", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSub("stu-1", "men-1", "inst-1") as never);
    expect(await resolveFileAccess(fileKey, "men-OTHER", "MENTOR")).toBe(false);
  });

  it("course instructor passes", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSub("stu-1", null, "inst-1") as never);
    expect(await resolveFileAccess(fileKey, "inst-1", "INSTRUCTOR")).toBe(true);
  });

  it("returns false when submission not found", async () => {
    vi.mocked(prisma.submission.findUnique).mockResolvedValue(null);
    expect(await resolveFileAccess(fileKey, "anyone", "MENTOR")).toBe(false);
  });
});

// ── assignments/* — AttachmentVisibility ─────────────────────────────────────

describe("resolveFileAccess — assignments/*", () => {
  const fileKey = "assignments/5/guide/file.pdf";

  const approvedEnrollment = { status: "APPROVED" };
  const pendingEnrollment = { status: "PENDING" };

  beforeEach(() => {
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue({
      id: 5,
      lesson: { courseId: 100 },
    } as never);
  });

  it("INSTRUCTOR always passes", async () => {
    expect(await resolveFileAccess(fileKey, "inst-1", "INSTRUCTOR")).toBe(true);
  });

  it("INTERNAL_ONLY is always denied for STUDENT", async () => {
    vi.mocked(prisma.assignmentAttachment.findFirst).mockResolvedValue({
      visibility: "INTERNAL_ONLY",
      assignmentId: 5,
    } as never);
    expect(await resolveFileAccess(fileKey, "stu-1", "STUDENT")).toBe(false);
  });

  it("STUDENT_ANYTIME passes for approved enrollee", async () => {
    vi.mocked(prisma.assignmentAttachment.findFirst).mockResolvedValue({
      visibility: "STUDENT_ANYTIME",
      assignmentId: 5,
    } as never);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(approvedEnrollment as never);
    expect(await resolveFileAccess(fileKey, "stu-1", "STUDENT")).toBe(true);
  });

  it("STUDENT_ANYTIME is denied for non-enrollee", async () => {
    vi.mocked(prisma.assignmentAttachment.findFirst).mockResolvedValue({
      visibility: "STUDENT_ANYTIME",
      assignmentId: 5,
    } as never);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(pendingEnrollment as never);
    expect(await resolveFileAccess(fileKey, "stu-1", "STUDENT")).toBe(false);
  });

  it("STUDENT_AFTER_SUBMIT passes when submission is SUBMITTED", async () => {
    vi.mocked(prisma.assignmentAttachment.findFirst).mockResolvedValue({
      visibility: "STUDENT_AFTER_SUBMIT",
      assignmentId: 5,
    } as never);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(approvedEnrollment as never);
    vi.mocked(prisma.submission.findFirst).mockResolvedValue({ status: "SUBMITTED" } as never);
    expect(await resolveFileAccess(fileKey, "stu-1", "STUDENT")).toBe(true);
  });

  it("STUDENT_AFTER_SUBMIT is denied when no submission", async () => {
    vi.mocked(prisma.assignmentAttachment.findFirst).mockResolvedValue({
      visibility: "STUDENT_AFTER_SUBMIT",
      assignmentId: 5,
    } as never);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(approvedEnrollment as never);
    vi.mocked(prisma.submission.findFirst).mockResolvedValue(null);
    expect(await resolveFileAccess(fileKey, "stu-1", "STUDENT")).toBe(false);
  });

  it("STUDENT_AFTER_APPROVED passes only when submission is APPROVED", async () => {
    vi.mocked(prisma.assignmentAttachment.findFirst).mockResolvedValue({
      visibility: "STUDENT_AFTER_APPROVED",
      assignmentId: 5,
    } as never);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(approvedEnrollment as never);
    vi.mocked(prisma.submission.findFirst).mockResolvedValue({ status: "APPROVED" } as never);
    expect(await resolveFileAccess(fileKey, "stu-1", "STUDENT")).toBe(true);
  });

  it("STUDENT_AFTER_APPROVED is denied when submission is SUBMITTED (not yet approved)", async () => {
    vi.mocked(prisma.assignmentAttachment.findFirst).mockResolvedValue({
      visibility: "STUDENT_AFTER_APPROVED",
      assignmentId: 5,
    } as never);
    vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(approvedEnrollment as never);
    vi.mocked(prisma.submission.findFirst).mockResolvedValue({ status: "SUBMITTED" } as never);
    expect(await resolveFileAccess(fileKey, "stu-1", "STUDENT")).toBe(false);
  });
});

// ── covers/* ─────────────────────────────────────────────────────────────────

describe("resolveFileAccess — covers/*", () => {
  it("passes for any authenticated user", async () => {
    expect(await resolveFileAccess("covers/1/img.jpg", "stu-1", "STUDENT")).toBe(true);
  });
});

// ── certificates/* ───────────────────────────────────────────────────────────

describe("resolveFileAccess — certificates/*", () => {
  it("passes for the certificate owner", async () => {
    vi.mocked(prisma.certificate.findFirst).mockResolvedValue({ userId: "stu-1" } as never);
    expect(await resolveFileAccess("certificates/stu-1/course-1.pdf", "stu-1", "STUDENT")).toBe(true);
  });

  it("denied for a different user", async () => {
    vi.mocked(prisma.certificate.findFirst).mockResolvedValue({ userId: "stu-1" } as never);
    expect(await resolveFileAccess("certificates/stu-1/course-1.pdf", "stu-2", "STUDENT")).toBe(false);
  });
});

// ── unknown prefix ────────────────────────────────────────────────────────────

describe("resolveFileAccess — unknown prefix", () => {
  it("returns false for unknown prefix (non-admin)", async () => {
    expect(await resolveFileAccess("unknown/key", "stu-1", "STUDENT")).toBe(false);
  });
});
