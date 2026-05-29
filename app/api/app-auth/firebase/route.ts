import { NextResponse } from "next/server";

import { createOrUpdateExternalUser, setSession } from "@/lib/app-auth";

export async function POST(request: Request) {
  try {
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

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Server database is not configured. Add DATABASE_URL in Vercel Environment Variables." },
        { status: 503 }
      );
    }

    const user = await createOrUpdateExternalUser({ email, name, image });
    await setSession(user.id);

    return NextResponse.json({ user, redirectTo: "/" });
  } catch (error) {
    console.error("Firebase app auth failed", error);

    return NextResponse.json(
      { error: "Google sign-in failed on the server. Check Vercel logs and environment variables." },
      { status: 500 }
    );
  }
}
