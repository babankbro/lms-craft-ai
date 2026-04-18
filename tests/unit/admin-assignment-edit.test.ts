import { describe, it, expect } from "vitest";

const RESPONSE_TYPE_LABEL: Record<string, string> = {
  TEXT: "ข้อความ",
  FILE: "ไฟล์",
  BOTH: "ข้อความ + ไฟล์",
};

// Mirrors display logic from assignment edit page
function formatDueDateForInput(dueDate: Date | null): string {
  if (!dueDate) return "";
  return dueDate.toISOString().slice(0, 16);
}

function getResponseTypeLabel(responseType: string): string {
  return RESPONSE_TYPE_LABEL[responseType] ?? responseType;
}

function canDeleteAssignmentInAdmin(submissionCount: number, isAdmin: boolean): boolean {
  if (submissionCount === 0) return true;
  return isAdmin; // only admin can force-delete
}

function getAssignmentScope(assignment: { lessonId: number | null; courseId: number | null }): "lesson" | "course" {
  return assignment.lessonId != null ? "lesson" : "course";
}

describe("admin assignment edit page — display logic", () => {
  it("formats dueDate for datetime-local input", () => {
    const date = new Date("2026-06-01T14:30:00.000Z");
    expect(formatDueDateForInput(date)).toBe("2026-06-01T14:30");
  });

  it("returns empty string for null dueDate", () => {
    expect(formatDueDateForInput(null)).toBe("");
  });

  it("returns correct response type labels", () => {
    expect(getResponseTypeLabel("TEXT")).toBe("ข้อความ");
    expect(getResponseTypeLabel("FILE")).toBe("ไฟล์");
    expect(getResponseTypeLabel("BOTH")).toBe("ข้อความ + ไฟล์");
  });

  it("returns raw type for unknown response type", () => {
    expect(getResponseTypeLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

describe("admin assignment edit page — delete guard", () => {
  it("allows non-admin to delete with no submissions", () => {
    expect(canDeleteAssignmentInAdmin(0, false)).toBe(true);
  });

  it("blocks non-admin from deleting with submissions", () => {
    expect(canDeleteAssignmentInAdmin(3, false)).toBe(false);
  });

  it("allows admin to force-delete with submissions", () => {
    expect(canDeleteAssignmentInAdmin(3, true)).toBe(true);
  });
});

describe("admin assignment edit page — scope detection", () => {
  it("detects lesson-level assignment", () => {
    expect(getAssignmentScope({ lessonId: 5, courseId: null })).toBe("lesson");
  });

  it("detects course-level assignment", () => {
    expect(getAssignmentScope({ lessonId: null, courseId: 1 })).toBe("course");
  });
});
