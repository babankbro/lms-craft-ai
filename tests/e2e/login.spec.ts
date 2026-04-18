import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("shows login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading")).toContainText("ระบบนิเทศ");
    await expect(page.getByLabel("อีเมล")).toBeVisible();
    await expect(page.getByLabel("รหัสผ่าน")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill("wrong@email.com");
    await page.getByLabel("รหัสผ่าน").fill("wrongpass");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page.getByText("ไม่ถูกต้อง")).toBeVisible();
  });

  test("redirects to dashboard on valid login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill("admin@ksu.ac.th");
    await page.getByLabel("รหัสผ่าน").fill("password123");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await page.waitForURL("/dashboard");
    await expect(page.getByText("สวัสดี")).toBeVisible();
  });

  test("unauthenticated user redirected from /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
  });
});
