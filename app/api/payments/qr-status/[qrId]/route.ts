import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { markPaymentSuccess } from "@/lib/payment-records";
import { getRazorpayClient, toPaise } from "@/lib/razorpay";

type QrStatusRouteProps = {
  params: {
    qrId: string;
  };
};

export async function GET(_request: Request, { params }: QrStatusRouteProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payment = await db.payment.findFirst({
      where: {
        qrRef: params.qrId,
        order: { userId },
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "QR payment record not found." },
        { status: 404 }
      );
    }

    if (payment.status === "SUCCESS") {
      return NextResponse.json({ status: "paid" });
    }

    if (payment.qrExpiresAt && payment.qrExpiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ status: "expired" });
    }

    const razorpay = getRazorpayClient();
    const [qr, payments] = await Promise.all([
      razorpay.qrCode.fetch(params.qrId),
      razorpay.qrCode.fetchAllPayments(params.qrId),
    ]);
    const paidPayment = payments.items.find(
      (item) =>
        item.status === "captured" &&
        Number(item.amount) >= toPaise(payment.amount)
    );

    if (
      qr.close_reason === "paid" ||
      qr.payments_amount_received >= toPaise(payment.amount) ||
      paidPayment
    ) {
      const order = await markPaymentSuccess({
        payment,
        razorpayPaymentId: paidPayment?.id ?? params.qrId,
        metadata: {
          verifiedBy: "qr-poll",
          qrStatus: qr.status,
        },
      });

      return NextResponse.json({ status: "paid", order });
    }

    return NextResponse.json({ status: "pending" });
  } catch {
    return NextResponse.json(
      { error: "Unable to check QR payment status right now." },
      { status: 503 }
    );
  }
}
