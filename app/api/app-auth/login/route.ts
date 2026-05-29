import { NextResponse } from "next/server";

import { authenticateUser, setSession } from "@/lib/app-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await setSession(user.id);

  return NextResponse.json({
    user,
    redirectTo: user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin/users" : "/",
  });
}
