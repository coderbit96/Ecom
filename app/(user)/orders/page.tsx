import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";

import { OrdersListView } from "@/components/user/orders-list-view";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderItemsCount } from "@/lib/order-utils";

export const metadata: Metadata = {
  title: "My Orders | Premium Commerce",
};

type OrdersPageProps = {
  searchParams: {
    status?: string;
  };
};

const ORDER_STATUSES: OrderStatus[] = [
  "PROCESSING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await auth();
  const status = ORDER_STATUSES.includes(searchParams.status as OrderStatus)
    ? (searchParams.status as OrderStatus)
    : undefined;

  const orders = session?.user?.id
    ? await db.order
        .findMany({
          where: {
            userId: session.user.id,
            ...(status ? { status } : {}),
          },
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
          },
        })
        .catch(() => [])
    : [];

  return (
    <OrdersListView
      selectedStatus={status ?? "ALL"}
      orders={orders.map((order) => ({
        id: order.id,
        createdAt: order.createdAt.toISOString(),
        itemsCount: getOrderItemsCount(order),
        total: order.total,
        status: order.status,
      }))}
    />
  );
}
