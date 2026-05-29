import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { normalizeCartItems } from "@/lib/cart-types";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }

  const cart = await db.userCart
    .findUnique({
      where: { userId },
      select: { items: true },
    })
    .catch(() => null);

  return NextResponse.json({
    items: normalizeCartItems(cart?.items ?? []),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    items?: unknown;
  } | null;
  const items = normalizeCartItems(body?.items ?? []);

  const cart = await db.userCart
    .upsert({
      where: { userId },
      create: {
        userId,
        items,
      },
      update: {
        items,
      },
      select: {
        items: true,
      },
    })
    .catch(() => null);

  if (!cart) {
    return NextResponse.json(
      { error: "Cart sync is unavailable", items },
      { status: 503 }
    );
  }

  return NextResponse.json({
    items: normalizeCartItems(cart.items),
  });
}
