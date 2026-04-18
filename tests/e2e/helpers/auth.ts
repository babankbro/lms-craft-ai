import { APIRequestContext } from "@playwright/test";

/**
 * Performs a credentials login via NextAuth and returns the session cookies.
 * The returned cookies can be set on subsequent requests for authenticated access.
 */
export async function loginAs(
  request: APIRequestContext,
  email: string,
  password = "password123"
): Promise<string> {
  // Step 1: get CSRF token
  const csrfRes = await request.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  // Step 2: submit credentials
  const signInRes = await request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email,
      password,
      json: "true",
    },
  });

  // Collect Set-Cookie headers from the response
  const setCookie = signInRes.headers()["set-cookie"] ?? "";
  return setCookie;
}
