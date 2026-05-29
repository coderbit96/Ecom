import { NextResponse } from "next/server";

import {
  createUser,
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
    name?: unknown;
    password?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  try {
    const user = await createUser({ email, name, password });
    await setSession(user.id);
    return NextResponse.json({ user, redirectTo: "/" });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    console.error("Email signup failed", error);

    return NextResponse.json(
      { error: getAuthDatabaseErrorMessage(error) },
      { status: 503 }
    );
  }
}
