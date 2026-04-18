import { test, expect } from "@playwright/test";

test.describe("File Upload", () => {
  test("upload API rejects unauthenticated request", async ({ request }) => {
    const res = await request.post("/api/upload", {
      multipart: {
        file: {
          name: "test.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("test"),
        },
        prefix: "test",
      },
    });
    expect(res.status()).toBe(401);
  });
});
