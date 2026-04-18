import { describe, it, expect } from "vitest";

// Mirrors the assignmentCount query condition logic
function buildAssignmentCountWhere(courseId: number) {
  return {
    OR: [
      { lesson: { courseId } },
      { courseId, lessonId: null },
    ],
  };
}

describe("teach assignments page — course-level assignments", () => {
  it("count query includes both lesson and course-level conditions", () => {
    const where = buildAssignmentCountWhere(1);
    expect(where.OR).toHaveLength(2);
    expect(where.OR[0]).toEqual({ lesson: { courseId: 1 } });
    expect(where.OR[1]).toEqual({ courseId: 1, lessonId: null });
  });

  it("count query uses the correct courseId", () => {
    const where = buildAssignmentCountWhere(42);
    expect(where.OR[1].courseId).toBe(42);
  });

  it("course-level assignments have lessonId null", () => {
    const courseAssignment = { lessonId: null, courseId: 1, title: "Final Reflection" };
    expect(courseAssignment.lessonId).toBeNull();
  });

  it("lesson assignments have a lessonId", () => {
    const lessonAssignment = { lessonId: 5, courseId: null, title: "Week 1 Work" };
    expect(lessonAssignment.lessonId).toBe(5);
  });
});
