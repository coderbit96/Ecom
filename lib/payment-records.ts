import type { Order, Payment, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type OrderWithPayment = Order & {
  payments: Payment[];
};

export async function getOwnedOrderWithPayment(orderId: string, userId: string) {
  return db.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      payments: true,
    },
  });
}

export async function markPaymentSuccess({
  payment,
  razorpayPaymentId,
  razorpaySignature,
  metadata,
}: {
  payment: Payment;
  razorpayPaymentId: string;
  razorpaySignature?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const [, order] = await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        gatewayTxnId: razorpayPaymentId,
        razorpayPaymentId,
        razorpaySignature: razorpaySignature ?? payment.razorpaySignature,
        failureReason: null,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        paidAt: new Date(),
      },
    }),
    db.order.update({
      where: { id: payment.orderId },
      data: { status: "CONFIRMED" },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
                  take: 1,
                },
              },
            },
          },
        },
        payments: true,
        address: true,
      },
    }),
  ]);

  await db.userCart
    .upsert({
      where: { userId: order.userId },
      create: { userId: order.userId, items: [] },
      update: { items: [] },
    })
    .catch(() => null);

  await db.activityLog
    .create({
      data: {
        userId: order.userId,
        action: "ORDER_CONFIRMATION_EMAIL_QUEUED",
        metadata: { orderId: order.id },
      },
    })
    .catch(() => null);

  return order;
}

export async function markPaymentFailed({
  payment,
  reason,
  metadata,
}: {
  payment: Payment;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return db.payment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED",
      failureReason: reason ?? "Payment failed",
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
