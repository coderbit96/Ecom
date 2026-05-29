import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

type AddressRouteProps = {
  params: {
    id: string;
  };
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, { params }: AddressRouteProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = readString(body?.action);

  if (action === "set-default") {
    const existing = await db.address.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    await db.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    const address = await db.address.update({
      where: { id: params.id },
      data: { isDefault: true },
    });

    return NextResponse.json({ address });
  }

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

  const existing = await db.address.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  if (isDefault) {
    await db.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  const address = await db.address.update({
    where: { id: params.id },
    data: {
      label,
      line1,
      line2: line2 || null,
      city,
      state,
      pincode,
      isDefault,
    },
  });

  return NextResponse.json({ address });
}

export async function DELETE(_request: Request, { params }: AddressRouteProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.address.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const orderCount = await db.order.count({
    where: { addressId: params.id, userId },
  });

  if (orderCount > 0) {
    return NextResponse.json(
      { error: "Addresses used by orders cannot be deleted." },
      { status: 409 }
    );
  }

  await db.address.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
