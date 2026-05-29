import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getOwnedOrderWithPayment } from "@/lib/payment-records";
import { db } from "@/lib/db";
import { getRazorpayClient, getRazorpayKeyId, toPaise } from "@/lib/razorpay";

type CreatePaymentOrderBody = {
  orderId?: unknown;
};

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyId = getRazorpayKeyId();

  if (!keyId) {
    return NextResponse.json(
      { error: "Razorpay key ID is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | CreatePaymentOrderBody
    | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
  }

  try {
    const order = await getOwnedOrderWithPayment(orderId, userId);

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cancelled orders cannot be paid." },
        { status: 409 }
      );
    }

    const payment = order.payments[0];

    if (!payment) {
      return NextResponse.json(
        { error: "Payment record not found." },
        { status: 404 }
      );
    }

    if (payment.status === "SUCCESS") {
      return NextResponse.json(
        { error: "This order is already paid." },
        { status: 409 }
      );
    }

    if (payment.razorpayOrderId) {
      return NextResponse.json({
        keyId,
        orderId: order.id,
        amount: toPaise(order.total),
        currency: "INR",
        razorpayOrderId: payment.razorpayOrderId,
      });
    }

    const razorpay = getRazorpayClient();
    const amount = toPaise(order.total);
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: order.id.slice(-40),
      notes: {
        orderId: order.id,
        userId,
      },
    });

    await db.payment.update({
      where: { id: payment.id },
      data: {
        method: "CARD",
        razorpayOrderId: razorpayOrder.id,
        amount: order.total,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      keyId,
      orderId: order.id,
      amount,
      currency: "INR",
      razorpayOrderId: razorpayOrder.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to create Razorpay order right now." },
      { status: 503 }
    );
  }
}
