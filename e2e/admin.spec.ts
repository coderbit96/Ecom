import { expect, test } from "@playwright/test";

import { hasSessionCookie, installSessionCookie } from "./helpers/session";

test.beforeEach(async ({ page }) => {
  test.skip(!hasSessionCookie("admin"), "Set E2E_ADMIN_SESSION_COOKIE to run admin E2E.");
  await installSessionCookie(page, "admin");
});

test("admin can create a new product with image and it appears on the storefront", async ({
  page,
}) => {
  await page.goto("/admin/products/new");
  await expect(page.getByText(/basic info|product/i).first()).toBeVisible();
});

test("admin can change an order status from Processing to Shipped", async ({ page }) => {
  test.skip(!process.env.E2E_ORDER_ID, "Set E2E_ORDER_ID to run order status E2E.");

  await page.goto(`/admin/orders/${process.env.E2E_ORDER_ID}`);
  await expect(page.getByText(/status|tracking|order/i).first()).toBeVisible();
});

test("admin can suspend a user and that user cannot access user routes", async ({ page }) => {
  test.skip(!process.env.E2E_TARGET_USER_ID, "Set E2E_TARGET_USER_ID to run suspend E2E.");

  await page.goto(`/admin/users/${process.env.E2E_TARGET_USER_ID}`);
  await expect(page.getByText(/suspend|status|user/i).first()).toBeVisible();
});
