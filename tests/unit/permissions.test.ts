import { describe, it, expect } from "vitest";
import { canReview, canManage, canAuthor } from "@/lib/permissions";

describe("permissions", () => {
  describe("canReview", () => {
    it("returns true for MENTOR role", () => {
      expect(canReview("MENTOR")).toBe(true);
    });

    it("returns true for INSTRUCTOR role", () => {
      expect(canReview("INSTRUCTOR")).toBe(true);
    });

    it("returns true for ADMIN role", () => {
      expect(canReview("ADMIN")).toBe(true);
    });

    it("returns false for STUDENT role", () => {
      expect(canReview("STUDENT")).toBe(false);
    });
  });

  describe("canManage", () => {
    it("returns true only for ADMIN", () => {
      expect(canManage("ADMIN")).toBe(true);
      expect(canManage("INSTRUCTOR")).toBe(false);
      expect(canManage("MENTOR")).toBe(false);
      expect(canManage("STUDENT")).toBe(false);
    });
  });

  describe("canAuthor", () => {
    it("returns true for INSTRUCTOR", () => {
      expect(canAuthor("INSTRUCTOR")).toBe(true);
    });

    it("returns true for ADMIN", () => {
      expect(canAuthor("ADMIN")).toBe(true);
    });

    it("returns false for MENTOR", () => {
      expect(canAuthor("MENTOR")).toBe(false);
    });

    it("returns false for STUDENT", () => {
      expect(canAuthor("STUDENT")).toBe(false);
    });
  });
});
