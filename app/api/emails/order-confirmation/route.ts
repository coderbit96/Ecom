import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    orderId?: unknown;
  } | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  const order = await db.order
    .findFirst({
      where: { id: orderId, userId },
      select: { id: true },
    })
    .catch(() => null);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await db.activityLog
    .create({
      data: {
        userId,
        action: "ORDER_CONFIRMATION_EMAIL_QUEUED",
        metadata: { orderId },
      },
    })
    .catch(() => null);

  return NextResponse.json({
    ok: true,
    message: "Order confirmation email queued.",
  });
}
