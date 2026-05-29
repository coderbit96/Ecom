import { expect, test } from "@playwright/test";

import { hasSessionCookie, installSessionCookie } from "./helpers/session";

test("landing on /login shows Google sign-in button", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible();
});

test("after mock Google OAuth login, user is redirected to homepage with session", async ({
  page,
}) => {
  test.skip(!hasSessionCookie("user"), "Set E2E_USER_SESSION_COOKIE to run auth E2E.");

  await installSessionCookie(page, "user");
  await page.goto("/user");

  await expect(page).toHaveURL(/\/user/);
});

test("admin user navigating to dashboard sees the dashboard", async ({ page }) => {
  test.skip(!hasSessionCookie("admin"), "Set E2E_ADMIN_SESSION_COOKIE to run admin E2E.");

  await installSessionCookie(page, "admin");
  await page.goto("/admin/dashboard");

  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
});
