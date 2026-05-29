import { NextResponse } from "next/server";

import { clearSession } from "@/lib/app-auth";

export async function POST() {
  clearSession();
  return NextResponse.json({ ok: true });
}
