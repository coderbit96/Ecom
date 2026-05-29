import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ACTIVE_ORDER_STATUSES = ["PROCESSING", "CONFIRMED"] as const;

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeOrders = await db.order.findMany({
      where: {
        userId,
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
      include: { items: true },
    });

    for (const order of activeOrders) {
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
    }

    await Promise.all([
      db.wishlist.deleteMany({ where: { userId } }),
      db.userCart.deleteMany({ where: { userId } }),
      db.session.deleteMany({ where: { userId } }),
      db.account.deleteMany({ where: { userId } }),
      db.address.updateMany({
        where: { userId },
        data: {
          label: "Deleted address",
          line1: "Deleted address",
          line2: null,
          city: "Deleted",
          state: "Deleted",
          pincode: "000000",
          isDefault: false,
        },
      }),
      db.review.updateMany({
        where: { userId },
        data: { comment: null },
      }),
    ]);

    await db.user.update({
      where: { id: userId },
      data: {
        googleId: `deleted-${userId}`,
        email: `deleted-${userId}@deleted.local`,
        name: "Deleted User",
        image: null,
        avatarUrl: null,
        phone: null,
        status: "SUSPENDED",
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to delete account right now." },
      { status: 503 }
    );
  }
}
