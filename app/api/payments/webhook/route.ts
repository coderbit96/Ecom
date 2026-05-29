import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { markPaymentFailed, markPaymentSuccess } from "@/lib/payment-records";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        error_description?: string | null;
      };
    };
    refund?: {
      entity?: {
        payment_id?: string;
        status?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const payloadText = await request.text();

  if (!verifyRazorpayWebhookSignature(payloadText, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    const payload = JSON.parse(payloadText) as RazorpayWebhookPayload;
    const paymentEntity = payload.payload?.payment?.entity;
    const refundEntity = payload.payload?.refund?.entity;

    if (payload.event === "payment.captured" && paymentEntity?.order_id) {
      const payment = await db.payment.findFirst({
        where: { razorpayOrderId: paymentEntity.order_id },
      });

      if (payment) {
        await markPaymentSuccess({
          payment,
          razorpayPaymentId: paymentEntity.id ?? paymentEntity.order_id,
          metadata: { verifiedBy: "webhook", event: payload.event },
        });
      }
    }

    if (payload.event === "payment.failed" && paymentEntity?.order_id) {
      const payment = await db.payment.findFirst({
        where: { razorpayOrderId: paymentEntity.order_id },
      });

      if (payment) {
        await markPaymentFailed({
          payment,
          reason: paymentEntity.error_description,
          metadata: { verifiedBy: "webhook", event: payload.event },
        });
      }
    }

    if (payload.event === "refund.processed" && refundEntity?.payment_id) {
      await db.payment.updateMany({
        where: { razorpayPaymentId: refundEntity.payment_id },
        data: {
          status: "REFUNDED",
          metadata: {
            verifiedBy: "webhook",
            event: payload.event,
            refundStatus: refundEntity.status ?? "processed",
          },
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process Razorpay webhook." },
      { status: 503 }
    );
  }
}
