import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";
import { getProtectedRouteRedirectPath } from "@/lib/auth-middleware";

const { auth } = NextAuth(authConfig);

function clearAuthCookies(response: NextResponse) {
  const cookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];

  for (const cookieName of cookieNames) {
    response.cookies.set(cookieName, "", {
      expires: new Date(0),
      path: "/",
    });
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const redirectPath = getProtectedRouteRedirectPath(req.auth, pathname);

  if (redirectPath) {
    const response = NextResponse.redirect(new URL(redirectPath, req.url));
    if (redirectPath === "/suspended") {
      clearAuthCookies(response);
    }
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};
