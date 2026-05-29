import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function clearDefaultAddress(userId: string) {
  await db.address.updateMany({
    where: { userId },
    data: { isDefault: false },
  });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ addresses: [] }, { status: 401 });
  }

  const addresses = await db.address
    .findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })
    .catch(() => []);

  return NextResponse.json({ addresses });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const label = readString(body?.label);
  const line1 = readString(body?.line1);
  const line2 = readString(body?.line2);
  const city = readString(body?.city);
  const state = readString(body?.state);
  const pincode = readString(body?.pincode);
  const isDefault = body?.isDefault === true;

  if (!label || !line1 || !city || !state || !PINCODE_REGEX.test(pincode)) {
    return NextResponse.json(
      { error: "A valid address is required." },
      { status: 400 }
    );
  }

  if (isDefault) {
    await clearDefaultAddress(userId);
  }

  const address = await db.address
    .create({
      data: {
        userId,
        label,
        line1,
        line2: line2 || null,
        city,
        state,
        pincode,
        country: "India",
        isDefault,
      },
    })
    .catch(() => null);

  if (!address) {
    return NextResponse.json(
      { error: "Unable to save address right now." },
      { status: 503 }
    );
  }

  return NextResponse.json({ address }, { status: 201 });
}
