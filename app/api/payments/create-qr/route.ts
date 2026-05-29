import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getOwnedOrderWithPayment } from "@/lib/payment-records";
import { db } from "@/lib/db";
import { getRazorpayClient, toPaise } from "@/lib/razorpay";

type CreateQrBody = {
  orderId?: unknown;
};

const QR_LIFETIME_MS = 10 * 60 * 1000;
const RAZORPAY_MIN_CLOSE_BY_SECONDS = 15 * 60;

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateQrBody | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
  }

  try {
    const order = await getOwnedOrderWithPayment(orderId, userId);

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const payment = order.payments[0];

    if (!payment) {
      return NextResponse.json(
        { error: "Payment record not found." },
        { status: 404 }
      );
    }

    if (
      payment.qrRef &&
      payment.qrImageUrl &&
      payment.qrExpiresAt &&
      payment.qrExpiresAt.getTime() > Date.now()
    ) {
      return NextResponse.json({
        orderId: order.id,
        qr_id: payment.qrRef,
        qr_image_url: payment.qrImageUrl,
        expires_at: payment.qrExpiresAt.toISOString(),
      });
    }

    const razorpay = getRazorpayClient();
    const amount = toPaise(order.total);
    const expiresAt = new Date(Date.now() + QR_LIFETIME_MS);
    const closeBy = Math.floor(Date.now() / 1000) + RAZORPAY_MIN_CLOSE_BY_SECONDS;

    const qr = await razorpay.qrCode.create({
      type: "upi_qr",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amount,
      name: `Order ${order.id.slice(-8)}`,
      description: `Payment for order ${order.id}`,
      close_by: closeBy,
      notes: {
        orderId: order.id,
        userId,
      },
    });

    await db.payment.update({
      where: { id: payment.id },
      data: {
        method: "QR",
        qrRef: qr.id,
        qrImageUrl: qr.image_url,
        qrExpiresAt: expiresAt,
        amount: order.total,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      qr_id: qr.id,
      qr_image_url: qr.image_url,
      expires_at: expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to create Razorpay QR right now." },
      { status: 503 }
    );
  }
}
