import { describe, it, expect } from "vitest";
import { isLocked } from "@/lib/submission-state";
import type { SubmissionStatus } from "@prisma/client";

// Mirrors the guard logic in /api/upload/route.ts
function canUploadToSubmission(
  submissionStudentId: string,
  sessionUserId: string,
  status: SubmissionStatus
): { allowed: boolean; reason?: string } {
  if (submissionStudentId !== sessionUserId)
    return { allowed: false, reason: "FORBIDDEN" };
  if (isLocked(status))
    return { allowed: false, reason: "SUBMISSION_LOCKED" };
  return { allowed: true };
}

describe("upload ownership guard", () => {
  it("allows owner to upload to a DRAFT submission", () => {
    expect(canUploadToSubmission("u1", "u1", "DRAFT")).toEqual({ allowed: true });
  });

  it("allows owner to upload to a REVISION_REQUESTED submission", () => {
    expect(canUploadToSubmission("u1", "u1", "REVISION_REQUESTED")).toEqual({ allowed: true });
  });

  it("blocks non-owner from uploading to any submission", () => {
    const result = canUploadToSubmission("u1", "u2", "DRAFT");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("FORBIDDEN");
  });

  it("blocks owner from uploading to a SUBMITTED submission", () => {
    const result = canUploadToSubmission("u1", "u1", "SUBMITTED");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("SUBMISSION_LOCKED");
  });

  it("blocks owner from uploading to an APPROVED submission", () => {
    const result = canUploadToSubmission("u1", "u1", "APPROVED");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("SUBMISSION_LOCKED");
  });

  it("blocks owner from uploading to an UNDER_REVIEW submission", () => {
    const result = canUploadToSubmission("u1", "u1", "UNDER_REVIEW");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("SUBMISSION_LOCKED");
  });
});
