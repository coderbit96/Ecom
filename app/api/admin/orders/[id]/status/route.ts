import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";

const STATUSES = new Set([
  "PROCESSING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
    trackingNumber?: unknown;
  } | null;
  const status = typeof body?.status === "string" ? body.status.toUpperCase() : "";
  const trackingNumber =
    typeof body?.trackingNumber === "string" ? body.trackingNumber.trim() : "";

  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await db.order.update({
    where: { id: params.id },
    data: {
      status: status as OrderStatus,
      ...(status === "SHIPPED" && trackingNumber ? { trackingNumber } : {}),
    },
    select: { id: true, userId: true },
  });

  await db.activityLog.create({
    data: {
      userId: order.userId,
      action: "ORDER_STATUS_UPDATED",
      metadata: { orderId: order.id, status, trackingNumber, changedBy: session?.user?.id },
      device: "Admin panel",
    },
  });

  return NextResponse.json({ ok: true });
}
