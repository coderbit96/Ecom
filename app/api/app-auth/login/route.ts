import { NextResponse } from "next/server";

import {
  authenticateUser,
  getAuthConfigError,
  getAuthDatabaseErrorMessage,
  setSession,
} from "@/lib/app-auth";

export async function POST(request: Request) {
  const configError = getAuthConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await setSession(user.id);

    return NextResponse.json({
      user,
      redirectTo: user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin/users" : "/",
    });
  } catch (error) {
    console.error("Email login failed", error);

    return NextResponse.json(
      { error: getAuthDatabaseErrorMessage(error) },
      { status: 503 }
    );
  }
}
