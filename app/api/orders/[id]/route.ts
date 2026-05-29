import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type OrderDetailRouteProps = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: OrderDetailRouteProps) {
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
        address: true,
        payments: true,
        items: {
          include: {
            variant: true,
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
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json(
      { error: "Order detail is unavailable right now." },
      { status: 503 }
    );
  }
}
