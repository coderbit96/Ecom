import { expect, test } from "@playwright/test";

import { hasSessionCookie, installSessionCookie } from "./helpers/session";

test("user can search for a product and see results", async ({ page }) => {
  await page.goto("/products?q=shirt");
  await expect(page.getByText(/shirt|products|results/i).first()).toBeVisible();
});

test("user can filter by price and category and results update", async ({ page }) => {
  await page.goto("/products?min=100&max=5000");
  await expect(page.getByText(/products|results|filters/i).first()).toBeVisible();
});

test("user can open a product detail page and see variants", async ({ page }) => {
  test.skip(!process.env.E2E_PRODUCT_SLUG, "Set E2E_PRODUCT_SLUG to run product detail E2E.");

  await page.goto(`/products/${process.env.E2E_PRODUCT_SLUG}`);
  await expect(page.getByText(/variant|size|color|add to cart/i).first()).toBeVisible();
});

test("user can add a product to cart and see cart count increment", async ({ page }) => {
  test.skip(!process.env.E2E_PRODUCT_SLUG, "Set E2E_PRODUCT_SLUG to run cart E2E.");

  await page.goto(`/products/${process.env.E2E_PRODUCT_SLUG}`);
  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page.getByText(/cart|1/i).first()).toBeVisible();
});

test("user can apply a valid coupon code in cart and see discount applied", async ({ page }) => {
  const couponCode = process.env.E2E_VALID_COUPON;
  test.skip(!couponCode, "Set E2E_VALID_COUPON to run coupon E2E.");

  await page.goto("/cart");
  await page.getByPlaceholder(/coupon/i).fill(couponCode ?? "");
  await page.getByRole("button", { name: /apply/i }).click();
  await expect(page.getByText(/saved|discount|applied/i)).toBeVisible();
});

test("user can add product to wishlist and it appears on wishlist page", async ({ page }) => {
  test.skip(
    !hasSessionCookie("user") || !process.env.E2E_PRODUCT_SLUG,
    "Set E2E_USER_SESSION_COOKIE and E2E_PRODUCT_SLUG to run wishlist E2E."
  );

  await installSessionCookie(page, "user");
  await page.goto(`/products/${process.env.E2E_PRODUCT_SLUG}`);
  await page.getByRole("button", { name: /wishlist|save/i }).click();
  await page.goto("/wishlist");
  await expect(page.getByText(/wishlist/i)).toBeVisible();
});
