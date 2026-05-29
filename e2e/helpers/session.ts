import type { Page } from "@playwright/test";

type SessionKind = "user" | "admin";

export function hasSessionCookie(kind: SessionKind) {
  return Boolean(
    kind === "admin"
      ? process.env.E2E_ADMIN_SESSION_COOKIE
      : process.env.E2E_USER_SESSION_COOKIE
  );
}

export async function installSessionCookie(page: Page, kind: SessionKind) {
  const value =
    kind === "admin"
      ? process.env.E2E_ADMIN_SESSION_COOKIE
      : process.env.E2E_USER_SESSION_COOKIE;

  if (!value) {
    throw new Error(`Missing E2E_${kind.toUpperCase()}_SESSION_COOKIE`);
  }

  await page.context().addCookies([
    {
      name: process.env.E2E_SESSION_COOKIE_NAME ?? "authjs.session-token",
      value,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
