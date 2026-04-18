/**
 * P0-8: Submission file access control E2E tests.
 *
 * Requires a running dev server (pnpm dev) with seeded DB (pnpm db:seed).
 * Seed users:
 *   student1@school.ac.th — paired with mentor1
 *   student2@school.ac.th — different student (same mentor)
 *   mentor1@school.ac.th  — paired mentor of student1
 *   mentor2@school.ac.th  — unpaired mentor
 *
 * The test creates a Submission row with a synthetic fileKey in globalSetup
 * (see playwright.config.ts → globalSetup). The file does NOT need to exist
 * in MinIO because the permission check (403) runs before the S3 presign call.
 * An authorised request receives a 307 redirect to the presigned URL regardless
 * of whether the MinIO object exists.
 */
import { test, expect } from "@playwright/test";

// These values are set by globalSetup (tests/e2e/global-setup.ts)
const SUBMISSION_FILE_KEY = process.env.E2E_SUBMISSION_FILE_KEY ?? "submissions/1/test-file.pdf";

async function getSessionCookie(
  request: typeof test.info extends () => infer T ? T : never,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any,
  email: string
): Promise<string> {
  const csrfRes = await req.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const signInRes = await req.post("/api/auth/callback/credentials", {
    form: { csrfToken, email, password: "password123", json: "true" },
    maxRedirects: 0,
  });
  return signInRes.headers()["set-cookie"] ?? "";
}

test.describe("Submission file access control", () => {
  test("unauthenticated request returns 401", async ({ request }) => {
    const res = await request.get(`/api/files/${SUBMISSION_FILE_KEY}`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  });

  test("student who owns the submission can access it (302 redirect)", async ({ request }) => {
    const cookie = await getSessionCookie(undefined as never, request, "student1@school.ac.th");
    const res = await request.get(`/api/files/${SUBMISSION_FILE_KEY}`, {
      headers: { cookie },
      maxRedirects: 0,
    });
    // 302/307 means access was granted (presigned URL redirect)
    expect([302, 307, 308]).toContain(res.status());
  });

  test("different student (student2) is forbidden (403)", async ({ request }) => {
    const cookie = await getSessionCookie(undefined as never, request, "student2@school.ac.th");
    const res = await request.get(`/api/files/${SUBMISSION_FILE_KEY}`, {
      headers: { cookie },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
  });

  test("unpaired mentor (mentor2) is forbidden (403)", async ({ request }) => {
    const cookie = await getSessionCookie(undefined as never, request, "mentor2@school.ac.th");
    const res = await request.get(`/api/files/${SUBMISSION_FILE_KEY}`, {
      headers: { cookie },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
  });

  test("paired mentor (mentor1) can access it (302 redirect)", async ({ request }) => {
    const cookie = await getSessionCookie(undefined as never, request, "mentor1@school.ac.th");
    const res = await request.get(`/api/files/${SUBMISSION_FILE_KEY}`, {
      headers: { cookie },
      maxRedirects: 0,
    });
    expect([302, 307, 308]).toContain(res.status());
  });
});
