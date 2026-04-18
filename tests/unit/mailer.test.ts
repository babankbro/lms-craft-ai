import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    outboundEmail: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// Mock nodemailer
const mockSendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: (...a: unknown[]) => mockSendMail(...a) })) },
}));

// Must import AFTER mocks
import { enqueueEmail, flushEmailQueue } from "@/lib/mailer";

describe("enqueueEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an OutboundEmail record with status PENDING", async () => {
    mockCreate.mockResolvedValue({ id: 1 });
    await enqueueEmail("user-1", "ENROLLMENT_REQUESTED", { courseName: "Math 101" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        toUserId: "user-1",
        templateKey: "ENROLLMENT_REQUESTED",
        payloadJson: JSON.stringify({ courseName: "Math 101" }),
        status: "PENDING",
        attempts: 0,
      }),
    });
  });
});

describe("flushEmailQueue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends pending emails and marks them SENT", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 10,
        toUserId: "user-1",
        templateKey: "ENROLLMENT_REQUESTED",
        payloadJson: JSON.stringify({ courseName: "Math 101", studentName: "Alice", link: "/teach/1/enrollments" }),
        attempts: 0,
        user: { email: "instructor@test.com", fullName: "Bob" },
      },
    ]);
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    mockUpdate.mockResolvedValue({});

    await flushEmailQueue();

    expect(mockSendMail).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: expect.objectContaining({ status: "SENT" }) })
    );
  });

  it("marks email FAILED after max attempts", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 11,
        toUserId: "user-2",
        templateKey: "ENROLLMENT_REQUESTED",
        payloadJson: JSON.stringify({}),
        attempts: 2,
        user: { email: "admin@test.com", fullName: "Admin" },
      },
    ]);
    mockSendMail.mockRejectedValue(new Error("SMTP error"));
    mockUpdate.mockResolvedValue({});

    await flushEmailQueue();

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({ status: "FAILED" }),
      })
    );
  });

  it("increments attempts on transient error below max", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 12,
        toUserId: "user-3",
        templateKey: "ENROLLMENT_REQUESTED",
        payloadJson: JSON.stringify({}),
        attempts: 0,
        user: { email: "x@x.com", fullName: "X" },
      },
    ]);
    mockSendMail.mockRejectedValue(new Error("timeout"));
    mockUpdate.mockResolvedValue({});

    await flushEmailQueue();

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 12 },
        data: expect.objectContaining({ status: "PENDING", attempts: 1 }),
      })
    );
  });
});
