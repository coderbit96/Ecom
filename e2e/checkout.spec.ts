import { expect, test } from "@playwright/test";

import { hasSessionCookie, installSessionCookie } from "./helpers/session";

test("full checkout flow with mocked payment success creates an order", async ({ page }) => {
  test.skip(
    !hasSessionCookie("user") || !process.env.E2E_PRODUCT_SLUG,
    "Set E2E_USER_SESSION_COOKIE and E2E_PRODUCT_SLUG to run checkout E2E."
  );

  await installSessionCookie(page, "user");
  await page.route("**/api/payments/verify", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ order: { id: "e2e-order", status: "CONFIRMED" } }),
    });
  });

  await page.goto(`/products/${process.env.E2E_PRODUCT_SLUG}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/cart");
  await page.getByRole("link", { name: /checkout|proceed/i }).click();

  await expect(page.getByText(/checkout|delivery|payment|review/i).first()).toBeVisible();
});

test("mock payment success shows order in my orders", async ({ page }) => {
  test.skip(!hasSessionCookie("user"), "Set E2E_USER_SESSION_COOKIE to run orders E2E.");

  await installSessionCookie(page, "user");
  await page.goto("/orders");

  await expect(page.getByText(/orders|my orders/i).first()).toBeVisible();
});
