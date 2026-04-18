import { describe, it, expect } from "vitest";

// Mirrors sectionId parsing in admin lesson updateLesson
function parseSectionId(raw: string | null): number | null {
  if (!raw || raw === "" || raw === "none") return null;
  const n = parseInt(raw, 10);
  return isNaN(n) || n === 0 ? null : n;
}

// Mirrors lesson create link generation with lessonId pre-fill
function assignmentCreateLink(courseId: number, lessonId: number): string {
  return `/admin/courses/${courseId}/assignments/new?lessonId=${lessonId}`;
}

function assignmentEditLink(courseId: number, assignmentId: number): string {
  return `/admin/courses/${courseId}/assignments/${assignmentId}`;
}

describe("admin lesson editor — sectionId parsing", () => {
  it("returns null for empty string", () => {
    expect(parseSectionId("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseSectionId(null)).toBeNull();
  });

  it("parses valid section id", () => {
    expect(parseSectionId("3")).toBe(3);
  });

  it("returns null for zero", () => {
    expect(parseSectionId("0")).toBeNull();
  });
});

describe("admin lesson editor — assignment links", () => {
  it("generates create link with lessonId", () => {
    expect(assignmentCreateLink(1, 5)).toBe("/admin/courses/1/assignments/new?lessonId=5");
  });

  it("generates edit link with assignmentId", () => {
    expect(assignmentEditLink(1, 10)).toBe("/admin/courses/1/assignments/10");
  });
});
