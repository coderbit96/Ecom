import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user?.id || !role || !ADMIN_ROLES.has(role)) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, response: null };
}
