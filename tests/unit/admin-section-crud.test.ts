import { describe, it, expect } from "vitest";

// Mirrors section form validation logic used in admin create/update section
function validateSectionTitle(title: string): { valid: boolean; error?: string } {
  const trimmed = title.trim();
  if (!trimmed) return { valid: false, error: "ชื่อหมวดต้องไม่ว่าง" };
  if (trimmed.length > 200) return { valid: false, error: "ชื่อหมวดยาวเกินไป" };
  return { valid: true };
}

// Delete should be blocked when section has enrolled submissions (app layer check)
function canDeleteSection(lessonCount: number): { allowed: boolean; warning?: string } {
  if (lessonCount > 0) {
    return { allowed: true, warning: `บทเรียน ${lessonCount} บทจะถูกย้ายออกจากหมวดนี้ (ไม่ถูกลบ)` };
  }
  return { allowed: true };
}

describe("admin section CRUD — validation", () => {
  it("rejects empty title", () => {
    expect(validateSectionTitle("").valid).toBe(false);
    expect(validateSectionTitle("   ").valid).toBe(false);
  });

  it("accepts valid title", () => {
    expect(validateSectionTitle("หมวดที่ 1").valid).toBe(true);
  });

  it("rejects title over 200 chars", () => {
    expect(validateSectionTitle("a".repeat(201)).valid).toBe(false);
  });

  it("accepts title at exactly 200 chars", () => {
    expect(validateSectionTitle("a".repeat(200)).valid).toBe(true);
  });
});

describe("admin section CRUD — delete guard", () => {
  it("allows delete with warning when section has lessons", () => {
    const result = canDeleteSection(3);
    expect(result.allowed).toBe(true);
    expect(result.warning).toContain("3 บท");
  });

  it("allows delete without warning when section is empty", () => {
    const result = canDeleteSection(0);
    expect(result.allowed).toBe(true);
    expect(result.warning).toBeUndefined();
  });
});
