import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockCreateMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    enrollment: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    notification: {
      createMany: (...a: unknown[]) => mockCreateMany(...a),
    },
  },
}));

vi.mock("@/lib/permissions", () => ({
  requireRole: vi.fn(async () => ({ id: "admin-1", role: "ADMIN" })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  bulkApproveEnrollments,
  bulkRejectEnrollments,
} from "@/app/teach/[courseId]/enrollments/actions";

describe("bulkApproveEnrollments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("approves all pending enrollments in the list", async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, userId: "u1", status: "PENDING", courseId: 10, course: { authorId: "admin-1", title: "Math", slug: "math", id: 10 } },
      { id: 2, userId: "u2", status: "PENDING", courseId: 10, course: { authorId: "admin-1", title: "Math", slug: "math", id: 10 } },
    ]);
    mockUpdate.mockResolvedValue({});
    mockCreateMany.mockResolvedValue({ count: 2 });

    await bulkApproveEnrollments([1, 2]);

    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "u1", type: "ENROLLMENT_APPROVED" }),
          expect.objectContaining({ userId: "u2", type: "ENROLLMENT_APPROVED" }),
        ]),
      })
    );
  });

  it("skips non-pending enrollments", async () => {
    mockFindMany.mockResolvedValue([
      { id: 3, userId: "u3", status: "APPROVED", courseId: 10, course: { authorId: "admin-1", title: "Math", slug: "math", id: 10 } },
    ]);

    await bulkApproveEnrollments([3]);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreateMany).not.toHaveBeenCalled();
  });
});

describe("bulkRejectEnrollments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects all pending enrollments with reason", async () => {
    mockFindMany.mockResolvedValue([
      { id: 4, userId: "u4", status: "PENDING", courseId: 10, course: { authorId: "admin-1", title: "Math", slug: "math", id: 10 } },
    ]);
    mockUpdate.mockResolvedValue({});
    mockCreateMany.mockResolvedValue({ count: 1 });

    await bulkRejectEnrollments([4], "ไม่ผ่านเกณฑ์");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REJECTED", rejectReason: "ไม่ผ่านเกณฑ์" }),
      })
    );
  });
});
