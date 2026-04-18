import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("converts English title to slug", () => {
    expect(slugify("Introduction to Teaching")).toBe("introduction-to-teaching");
  });

  it("preserves Thai characters", () => {
    const result = slugify("หลักสูตรการสอน");
    expect(result).toContain("หลักสูตรการสอน");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("hello world")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("hello --- world")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Course #1: Math!")).toBe("course-1-math");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles accented characters", () => {
    // Accented chars like é are preserved (needed for Thai vowel marks)
    const result = slugify("café");
    expect(result).toBe("café");
  });
});
