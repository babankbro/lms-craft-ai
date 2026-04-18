import { describe, it, expect } from "vitest";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validateFile(
  file: { name: string; size: number; type: string }
): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE)
    return { valid: false, error: "File too large" };
  if (!ALLOWED_TYPES.includes(file.type))
    return { valid: false, error: "Invalid type" };
  if (!file.name || file.name.length === 0)
    return { valid: false, error: "No filename" };
  return { valid: true };
}

describe("File upload validation", () => {
  it("accepts valid PDF", () => {
    expect(
      validateFile({ name: "report.pdf", size: 1024, type: "application/pdf" })
    ).toEqual({ valid: true });
  });

  it("accepts valid JPEG", () => {
    expect(
      validateFile({ name: "photo.jpg", size: 2048, type: "image/jpeg" })
    ).toEqual({ valid: true });
  });

  it("rejects oversized file", () => {
    expect(
      validateFile({ name: "big.pdf", size: 20 * 1024 * 1024, type: "application/pdf" })
    ).toEqual({ valid: false, error: "File too large" });
  });

  it("rejects .exe file type", () => {
    expect(
      validateFile({ name: "virus.exe", size: 1024, type: "application/x-msdownload" })
    ).toEqual({ valid: false, error: "Invalid type" });
  });

  it("rejects empty filename", () => {
    expect(
      validateFile({ name: "", size: 1024, type: "application/pdf" })
    ).toEqual({ valid: false, error: "No filename" });
  });
});
