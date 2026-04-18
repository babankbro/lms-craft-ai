import { describe, it, expect } from "vitest";
import { canRecallSubmission } from "@/lib/submission-state";

// Mirrors the guard logic in recallSubmissionFromList
function guardRecall(
  studentId: string,
  callerId: string,
  status: string,
  dueDate: Date | null
): { ok: boolean; reason?: string } {
  if (studentId !== callerId) return { ok: false, reason: "Forbidden" };
  if (!canRecallSubmission(status as any, dueDate)) return { ok: false, reason: "Cannot recall" };
  return { ok: true };
}

describe("recallSubmissionFromList guard", () => {
  const future = new Date(Date.now() + 86400_000);
  const past   = new Date(Date.now() - 86400_000);

  it("allows owner to recall SUBMITTED with no deadline", () => {
    expect(guardRecall("u1", "u1", "SUBMITTED", null)).toEqual({ ok: true });
  });
  it("allows owner to recall SUBMITTED before deadline", () => {
    expect(guardRecall("u1", "u1", "SUBMITTED", future)).toEqual({ ok: true });
  });
  it("blocks non-owner", () => {
    expect(guardRecall("u1", "u2", "SUBMITTED", null).ok).toBe(false);
  });
  it("blocks recall after deadline", () => {
    expect(guardRecall("u1", "u1", "SUBMITTED", past).ok).toBe(false);
  });
  it("blocks recall when UNDER_REVIEW", () => {
    expect(guardRecall("u1", "u1", "UNDER_REVIEW", null).ok).toBe(false);
  });
  it("blocks recall when APPROVED", () => {
    expect(guardRecall("u1", "u1", "APPROVED", null).ok).toBe(false);
  });
});
