import { describe, it, expect } from "vitest";

type Status = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED";

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "REVISION_REQUESTED", "REJECTED"],
  REVISION_REQUESTED: ["SUBMITTED"],
  APPROVED: [],
  REJECTED: [],
};

function canTransition(from: Status, to: Status): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe("Submission status transitions", () => {
  it("allows SUBMITTED → UNDER_REVIEW", () => {
    expect(canTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
  });

  it("allows UNDER_REVIEW → APPROVED", () => {
    expect(canTransition("UNDER_REVIEW", "APPROVED")).toBe(true);
  });

  it("allows UNDER_REVIEW → REVISION_REQUESTED", () => {
    expect(canTransition("UNDER_REVIEW", "REVISION_REQUESTED")).toBe(true);
  });

  it("allows REVISION_REQUESTED → SUBMITTED (resubmit)", () => {
    expect(canTransition("REVISION_REQUESTED", "SUBMITTED")).toBe(true);
  });

  it("blocks SUBMITTED → APPROVED (skip review)", () => {
    expect(canTransition("SUBMITTED", "APPROVED")).toBe(false);
  });

  it("blocks APPROVED → any transition (terminal)", () => {
    expect(canTransition("APPROVED", "SUBMITTED")).toBe(false);
    expect(canTransition("APPROVED", "REJECTED")).toBe(false);
  });

  it("allows DRAFT → SUBMITTED", () => {
    expect(canTransition("DRAFT", "SUBMITTED")).toBe(true);
  });

  it("blocks DRAFT → APPROVED (skip submit)", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
  });
});

describe("reviewCycle increment", () => {
  it("increments reviewCycle on resubmission", () => {
    let reviewCycle = 1;
    function resubmit(status: string, cycle: number) {
      if (status !== "REVISION_REQUESTED") throw new Error("Invalid state");
      return { status: "SUBMITTED", reviewCycle: cycle + 1 };
    }
    const result = resubmit("REVISION_REQUESTED", reviewCycle);
    expect(result.reviewCycle).toBe(2);
    expect(result.status).toBe("SUBMITTED");
  });

  it("throws on resubmit from non-REVISION_REQUESTED state", () => {
    function resubmit(status: string, cycle: number) {
      if (status !== "REVISION_REQUESTED") throw new Error("Invalid state");
      return { status: "SUBMITTED", reviewCycle: cycle + 1 };
    }
    expect(() => resubmit("SUBMITTED", 1)).toThrow("Invalid state");
    expect(() => resubmit("APPROVED", 1)).toThrow("Invalid state");
  });

  it("tracks multiple revision cycles", () => {
    let reviewCycle = 1;
    function resubmit(cycle: number) { return cycle + 1; }
    reviewCycle = resubmit(reviewCycle); // cycle 2
    reviewCycle = resubmit(reviewCycle); // cycle 3
    expect(reviewCycle).toBe(3);
  });
});
