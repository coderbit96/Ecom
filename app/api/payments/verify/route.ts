import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { markPaymentSuccess } from "@/lib/payment-records";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";

type VerifyPaymentBody = {
  razorpay_payment_id?: unknown;
  razorpay_order_id?: unknown;
  razorpay_signature?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as VerifyPaymentBody | null;
  const razorpayPaymentId = readString(body?.razorpay_payment_id);
  const razorpayOrderId = readString(body?.razorpay_order_id);
  const razorpaySignature = readString(body?.razorpay_signature);

  if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    return NextResponse.json(
      { error: "Razorpay payment details are required." },
      { status: 400 }
    );
  }

  const isValid = verifyRazorpayPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!isValid) {
    return NextResponse.json(
      { error: "Payment signature verification failed." },
      { status: 400 }
    );
  }

  try {
    const payment = await db.payment.findFirst({
      where: {
        razorpayOrderId,
        order: { userId },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment record not found." },
        { status: 404 }
      );
    }

    const order = await markPaymentSuccess({
      payment,
      razorpayPaymentId,
      razorpaySignature,
      metadata: { verifiedBy: "checkout" },
    });

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json(
      { error: "Unable to verify payment right now." },
      { status: 503 }
    );
  }
}
