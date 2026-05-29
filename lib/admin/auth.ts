import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/app-auth";

export async function requireAdmin() {
  const user = await requireAdminUser();

  if (!user) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session: { user }, response: null };
}
