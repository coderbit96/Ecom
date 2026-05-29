import { NextResponse } from "next/server";

import { createOrUpdateExternalUser, setSession } from "@/lib/app-auth";

export async function POST(request: Request) {
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
}
