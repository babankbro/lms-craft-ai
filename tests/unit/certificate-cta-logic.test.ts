import { describe, it, expect } from "vitest";

type Role = "STUDENT" | "MENTOR" | "INSTRUCTOR" | "ADMIN";

function shouldShowCTA(isComplete: boolean, hasCert: boolean, role: Role): boolean {
  return role === "STUDENT" && isComplete && !hasCert;
}

function shouldShowDownload(hasCert: boolean, role: Role): boolean {
  return role === "STUDENT" && hasCert;
}

describe("certificate CTA logic", () => {
  it("shows CTA for STUDENT who is complete and has no cert", () => {
    expect(shouldShowCTA(true, false, "STUDENT")).toBe(true);
  });

  it("does not show CTA for STUDENT who already has cert", () => {
    expect(shouldShowCTA(true, true, "STUDENT")).toBe(false);
  });

  it("does not show CTA for STUDENT who is not complete", () => {
    expect(shouldShowCTA(false, false, "STUDENT")).toBe(false);
  });

  it("does not show CTA for INSTRUCTOR even if complete", () => {
    expect(shouldShowCTA(true, false, "INSTRUCTOR")).toBe(false);
  });

  it("does not show CTA for ADMIN even if complete", () => {
    expect(shouldShowCTA(true, false, "ADMIN")).toBe(false);
  });

  it("does not show CTA for MENTOR even if complete", () => {
    expect(shouldShowCTA(true, false, "MENTOR")).toBe(false);
  });

  it("shows download for STUDENT with cert", () => {
    expect(shouldShowDownload(true, "STUDENT")).toBe(true);
  });

  it("does not show download for STUDENT without cert", () => {
    expect(shouldShowDownload(false, "STUDENT")).toBe(false);
  });

  it("does not show download for INSTRUCTOR even with cert", () => {
    expect(shouldShowDownload(true, "INSTRUCTOR")).toBe(false);
  });
});
