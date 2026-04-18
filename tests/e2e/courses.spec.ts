import { test, expect } from "@playwright/test";

test.describe("Course Pages", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill("admin@ksu.ac.th");
    await page.getByLabel("รหัสผ่าน").fill("password123");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await page.waitForURL("/dashboard");
  });

  test("lists courses on /courses page", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.getByText("รายวิชาทั้งหมด")).toBeVisible();
  });

  test("admin can access /admin/courses", async ({ page }) => {
    await page.goto("/admin/courses");
    await expect(page).toHaveURL(/\/admin\/courses/);
  });
});
