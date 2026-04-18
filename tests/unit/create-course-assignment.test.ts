import { describe, it, expect } from "vitest";

// Mirrors scope-detection logic in new assignment page
function detectScope(searchParams: { scope?: string; lessonId?: string }): "course" | "lesson" {
  if (searchParams.scope === "course") return "course";
  return "lesson";
}

describe("create course-level assignment — scope detection", () => {
  it("detects course scope from search param", () => {
    expect(detectScope({ scope: "course" })).toBe("course");
  });

  it("defaults to lesson scope without scope param", () => {
    expect(detectScope({})).toBe("lesson");
  });

  it("defaults to lesson scope with lessonId param", () => {
    expect(detectScope({ lessonId: "5" })).toBe("lesson");
  });

  it("course scope takes precedence over lessonId", () => {
    expect(detectScope({ scope: "course", lessonId: "5" })).toBe("course");
  });
});
