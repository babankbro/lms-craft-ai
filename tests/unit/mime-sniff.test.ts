import { describe, it, expect } from "vitest";
import { sniffMime } from "@/lib/mime-sniff";

// Real PDF magic bytes: %PDF-
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
// EXE magic bytes: MZ
const EXE_MAGIC = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
// PNG magic bytes (need IHDR chunk after signature for file-type to confirm)
const PNG_MAGIC = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length + type
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 px
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
]);
// JPEG magic bytes: FF D8 FF
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
// DOCX is a ZIP with specific content — use ZIP magic: PK
const DOCX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

describe("sniffMime", () => {
  it("detects application/pdf from PDF magic bytes", async () => {
    const mime = await sniffMime(PDF_MAGIC);
    expect(mime).toBe("application/pdf");
  });

  it("detects image/png from PNG magic bytes", async () => {
    const mime = await sniffMime(PNG_MAGIC);
    expect(mime).toBe("image/png");
  });

  it("detects image/jpeg from JPEG magic bytes", async () => {
    const mime = await sniffMime(JPEG_MAGIC);
    expect(mime).toBe("image/jpeg");
  });

  it("detects application/x-msdownload or application/x-dosexec for EXE (not PDF)", async () => {
    const mime = await sniffMime(EXE_MAGIC);
    // Should NOT be pdf — exact MIME string depends on file-type version
    expect(mime).not.toBe("application/pdf");
    expect(mime).not.toBeUndefined();
  });

  it("returns undefined for empty/unrecognised buffer", async () => {
    const mime = await sniffMime(Buffer.from([]));
    expect(mime).toBeUndefined();
  });
});
