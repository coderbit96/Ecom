import { NextResponse } from "next/server";

import {
  createOrUpdateExternalUser,
  getAuthConfigError,
  getAuthDatabaseErrorMessage,
  setSession,
} from "@/lib/app-auth";

export async function POST(request: Request) {
  try {
    const configError = getAuthConfigError();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      name?: unknown;
      image?: unknown;
    } | null;

    const email = typeof body?.email === "string" ? body.email : "";
    const name = typeof body?.name === "string" ? body.name : null;
    const image = typeof body?.image === "string" ? body.image : null;

    if (!email) {
      return NextResponse.json({ error: "Google account email is required." }, { status: 400 });
    }

    const user = await createOrUpdateExternalUser({ email, name, image });
    await setSession(user.id);

    return NextResponse.json({ user, redirectTo: "/" });
  } catch (error) {
    console.error("Firebase app auth failed", error);

    return NextResponse.json(
      { error: getAuthDatabaseErrorMessage(error) },
      { status: 503 }
    );
  }
}
