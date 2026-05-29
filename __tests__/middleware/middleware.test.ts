import { getProtectedRouteRedirectPath } from "@/lib/auth-middleware";

describe("auth middleware route decisions", () => {
  it("redirects unauthenticated users from user routes to login", () => {
    expect(getProtectedRouteRedirectPath(null, "/user/profile")).toBe("/login");
  });

  it("redirects unauthenticated users from admin routes to login", () => {
    expect(getProtectedRouteRedirectPath(null, "/admin/dashboard")).toBe("/login");
  });

  it("redirects customers from admin routes to login", () => {
    expect(
      getProtectedRouteRedirectPath(
        { user: { role: "CUSTOMER", status: "ACTIVE" } },
        "/admin/orders"
      )
    ).toBe("/login");
  });

  it("redirects suspended users from protected routes to suspended page", () => {
    expect(
      getProtectedRouteRedirectPath(
        { user: { role: "CUSTOMER", status: "SUSPENDED" } },
        "/user/orders"
      )
    ).toBe("/suspended");
  });

  it("allows admins to access admin routes", () => {
    expect(
      getProtectedRouteRedirectPath(
        { user: { role: "ADMIN", status: "ACTIVE" } },
        "/admin/dashboard"
      )
    ).toBeNull();
  });
});
