import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PHONE_REGEX = /^[+]?[\d\s-]{7,16}$/;

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    phone?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (name.length > 80) {
    return NextResponse.json(
      { error: "Display name must be 80 characters or fewer." },
      { status: 400 }
    );
  }

  if (phone && !PHONE_REGEX.test(phone)) {
    return NextResponse.json(
      { error: "Enter a valid phone number." },
      { status: 400 }
    );
  }

  const user = await db.user
    .update({
      where: { id: userId },
      data: {
        name: name || null,
        phone: phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        avatarUrl: true,
        phone: true,
      },
    })
    .catch(() => null);

  if (!user) {
    return NextResponse.json(
      { error: "Unable to update profile right now." },
      { status: 503 }
    );
  }

  return NextResponse.json({ user });
}
