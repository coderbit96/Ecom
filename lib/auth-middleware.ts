const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

type ProtectedSession = {
  user?: {
    role?: string | null;
    status?: string | null;
  } | null;
} | null;

export function getProtectedRouteRedirectPath(
  session: ProtectedSession,
  pathname: string
) {
  const role = session?.user?.role;
  const status = session?.user?.status;

  if (status === "SUSPENDED") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/user")) {
      return "/suspended";
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!session || !role || !ADMIN_ROLES.has(role)) {
      return "/login";
    }
  }

  if (pathname.startsWith("/user")) {
    if (!session) {
      return "/login";
    }
  }

  return null;
}
