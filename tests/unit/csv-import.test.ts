import { describe, it, expect } from "vitest";

function parseCSVLine(line: string): string[] {
  return line.split(",").map((c) => c.trim());
}

function validateUserRow(
  cols: string[],
  headerMap: Record<string, number>
): { valid: boolean; error?: string } {
  const email = cols[headerMap["email"]];
  const fullName = cols[headerMap["full_name"]];
  const role = cols[headerMap["role"]]?.toUpperCase();

  if (!email || !email.includes("@")) return { valid: false, error: "Invalid email" };
  if (!fullName) return { valid: false, error: "Missing name" };
  if (!["STUDENT", "MENTOR", "INSTRUCTOR", "ADMIN"].includes(role))
    return { valid: false, error: "Invalid role" };
  return { valid: true };
}

describe("CSV import parsing", () => {
  const headerMap = { email: 0, full_name: 1, role: 2, group_name: 3 };

  it("parses valid CSV row with STUDENT role", () => {
    const cols = parseCSVLine("test@mail.com, John Doe, STUDENT, School A");
    expect(validateUserRow(cols, headerMap)).toEqual({ valid: true });
  });

  it("parses valid CSV row with MENTOR role", () => {
    const cols = parseCSVLine("mentor@mail.com, Jane Doe, MENTOR, School B");
    expect(validateUserRow(cols, headerMap)).toEqual({ valid: true });
  });

  it("rejects row with invalid email", () => {
    const cols = parseCSVLine("notanemail, John, STUDENT, School");
    expect(validateUserRow(cols, headerMap).valid).toBe(false);
  });

  it("rejects row with old role CAT (invalid)", () => {
    const cols = parseCSVLine("a@b.com, John, CAT, School");
    expect(validateUserRow(cols, headerMap).valid).toBe(false);
  });

  it("rejects row with missing name", () => {
    const cols = parseCSVLine("a@b.com, , STUDENT, School");
    expect(validateUserRow(cols, headerMap).valid).toBe(false);
  });
});
