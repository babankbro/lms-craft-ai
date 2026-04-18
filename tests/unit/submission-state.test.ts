import { describe, it, expect } from "vitest";
import { canTransition, assertTransition, assertEditable, isLocked } from "@/lib/submission-state";
import type { SubmissionStatus } from "@prisma/client";

describe("canTransition", () => {
  it("DRAFT → SUBMITTED is legal", () => {
    expect(canTransition("DRAFT", "SUBMITTED")).toBe(true);
  });
  it("DRAFT → APPROVED is illegal", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
  });
  it("SUBMITTED → UNDER_REVIEW is legal", () => {
    expect(canTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
  });
  it("SUBMITTED → APPROVED is legal (fast-track)", () => {
    expect(canTransition("SUBMITTED", "APPROVED")).toBe(true);
  });
  it("UNDER_REVIEW → REVISION_REQUESTED is legal", () => {
    expect(canTransition("UNDER_REVIEW", "REVISION_REQUESTED")).toBe(true);
  });
  it("UNDER_REVIEW → APPROVED is legal", () => {
    expect(canTransition("UNDER_REVIEW", "APPROVED")).toBe(true);
  });
  it("REVISION_REQUESTED → SUBMITTED is legal (resubmit)", () => {
    expect(canTransition("REVISION_REQUESTED", "SUBMITTED")).toBe(true);
  });
  it("REVISION_REQUESTED → APPROVED is illegal (must resubmit first)", () => {
    expect(canTransition("REVISION_REQUESTED", "APPROVED")).toBe(false);
  });
  it("APPROVED → DRAFT is illegal", () => {
    expect(canTransition("APPROVED", "DRAFT")).toBe(false);
  });
  it("REJECTED → SUBMITTED is illegal", () => {
    expect(canTransition("REJECTED", "SUBMITTED")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("does not throw on legal transition", () => {
    expect(() => assertTransition("DRAFT", "SUBMITTED")).not.toThrow();
  });
  it("throws on illegal transition", () => {
    expect(() => assertTransition("APPROVED", "DRAFT")).toThrow();
  });
});

describe("assertEditable", () => {
  it("does not throw for DRAFT", () => {
    expect(() => assertEditable("DRAFT")).not.toThrow();
  });
  it("does not throw for REVISION_REQUESTED", () => {
    expect(() => assertEditable("REVISION_REQUESTED")).not.toThrow();
  });
  it("throws for UNDER_REVIEW", () => {
    expect(() => assertEditable("UNDER_REVIEW")).toThrow();
  });
  it("throws for APPROVED", () => {
    expect(() => assertEditable("APPROVED")).toThrow();
  });
  it("throws for REJECTED", () => {
    expect(() => assertEditable("REJECTED")).toThrow();
  });
});

describe("isLocked", () => {
  const locked: SubmissionStatus[] = ["UNDER_REVIEW", "APPROVED", "REJECTED"];
  const unlocked: SubmissionStatus[] = ["DRAFT", "SUBMITTED", "REVISION_REQUESTED"];
  locked.forEach((s) => it(`${s} is locked`, () => expect(isLocked(s)).toBe(true)));
  unlocked.forEach((s) => it(`${s} is not locked`, () => expect(isLocked(s)).toBe(false)));
});
