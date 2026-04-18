/**
 * P0-8: AttachmentVisibility enforcement E2E tests.
 *
 * Tests that STUDENT_AFTER_APPROVED example files are blocked until the
 * student's submission reaches APPROVED status.
 *
 * Setup (see tests/e2e/global-setup.ts):
 *   - An AssignmentAttachment row with visibility = STUDENT_AFTER_APPROVED
 *     is created and its fileKey is exported as E2E_EXAMPLE_FILE_KEY.
 *   - A Submission for student1 is created with status SUBMITTED.
 *   - The globalSetup also exports the submission DB id as E2E_SUBMISSION_ID
 *     so the "approve" step can update it directly.
 */
import { test, expect } from "@playwright/test";

const EXAMPLE_FILE_KEY = process.env.E2E_EXAMPLE_FILE_KEY ?? "assignments/1/example/sample.pdf";

async function getCookie(
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

test.describe("Assignment attachment visibility — STUDENT_AFTER_APPROVED", () => {
  test("unauthenticated request returns 401", async ({ request }) => {
    const res = await request.get(`/api/files/preview/${EXAMPLE_FILE_KEY}`, {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(401);
  });

  test("INSTRUCTOR can always access the file (302 redirect)", async ({ request }) => {
    const cookie = await getCookie(request, "instructor@ksu.ac.th");
    const res = await request.get(`/api/files/preview/${EXAMPLE_FILE_KEY}`, {
      headers: { cookie },
      maxRedirects: 0,
    });
    expect([302, 307, 308]).toContain(res.status());
  });

  test("student with SUBMITTED (not yet approved) submission is forbidden (403)", async ({
    request,
  }) => {
    // student1's submission is SUBMITTED at this point (set by globalSetup)
    const cookie = await getCookie(request, "student1@school.ac.th");
    const res = await request.get(`/api/files/preview/${EXAMPLE_FILE_KEY}`, {
      headers: { cookie },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(403);
  });

  test("student with APPROVED submission can access the file (302 redirect)", async ({
    request,
  }) => {
    // Approve the submission via the admin API, then re-check access
    const adminCookie = await getCookie(request, "admin@ksu.ac.th");
    const submissionId = process.env.E2E_SUBMISSION_ID;
    if (submissionId) {
      await request.patch(`/api/admin/submissions/${submissionId}/status`, {
        headers: { cookie: adminCookie },
        data: { status: "APPROVED" },
      });
    }

    const cookie = await getCookie(request, "student1@school.ac.th");
    const res = await request.get(`/api/files/preview/${EXAMPLE_FILE_KEY}`, {
      headers: { cookie },
      maxRedirects: 0,
    });
    // Should now be allowed
    expect([302, 307, 308]).toContain(res.status());
  });
});
