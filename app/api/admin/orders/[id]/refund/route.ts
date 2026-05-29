import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { getRazorpayClient, toPaise } from "@/lib/razorpay";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { session, response } = await requireAdmin();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as {
    amount?: unknown;
    reason?: unknown;
  } | null;
  const amount = Number(body?.amount);
  const reason = typeof body?.reason === "string" ? body.reason : "Admin refund";

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Valid refund amount is required" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { id: params.id },
    include: { payments: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const payment = order.payments.find((item) => item.status === "SUCCESS") ?? order.payments[0];
  let gatewayRefund = "No gateway refund was attempted.";

  if (payment?.razorpayPaymentId) {
    try {
      const refund = await getRazorpayClient().payments.refund(payment.razorpayPaymentId, {
        amount: toPaise(amount),
        notes: { reason, orderId: order.id },
      });
      gatewayRefund = JSON.stringify(refund);
    } catch {
      gatewayRefund = "Gateway refund failed or credentials missing.";
    }
  }

  if (payment) {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        metadata: { refundAmount: amount, reason, gatewayRefund },
      },
    });
  }

  await db.activityLog.create({
    data: {
      userId: order.userId,
      action: "ORDER_REFUNDED",
      metadata: { orderId: order.id, amount, reason, gatewayRefund, issuedBy: session?.user?.id },
      device: "Admin panel",
    },
  });

  return NextResponse.json({ ok: true, gatewayRefund });
}
