import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CANCELLABLE_STATUSES } from "@/lib/order-utils";

type CancelOrderRouteProps = {
  params: {
    id: string;
  };
};

export async function PATCH(_request: Request, { params }: CancelOrderRouteProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const order = await db.order.findFirst({
      where: {
        id: params.id,
        userId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: "This order can no longer be cancelled" },
        { status: 409 }
      );
    }

    await db.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    await Promise.all(
      order.items.flatMap((item) => [
        db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        }),
        ...(item.variantId
          ? [
              db.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.qty } },
              }),
            ]
          : []),
      ])
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to cancel order right now" },
      { status: 503 }
    );
  }
}
