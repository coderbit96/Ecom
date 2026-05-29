"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";

import { formatCurrency, formatDate, getStatusClassName } from "@/lib/order-utils";

type OrderListItem = {
  id: string;
  createdAt: string;
  itemsCount: number;
  total: number;
  status: OrderStatus;
};

const ORDER_STATUSES: Array<OrderStatus | "ALL"> = [
  "ALL",
  "PROCESSING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export function OrdersListView({
  orders,
  selectedStatus,
}: {
  orders: OrderListItem[];
  selectedStatus: string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0f172a]">My Orders</h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Track, review, cancel, or download invoices for your orders.
          </p>
        </div>
        <label className="space-y-1.5">
          <span className="block text-xs font-semibold uppercase text-[#64748b]">
            Filter by status
          </span>
          <select
            value={selectedStatus}
            onChange={(event) => {
              const value = event.target.value;
              router.push(value === "ALL" ? "/orders" : `/orders?status=${value}`);
            }}
            className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm font-semibold text-[#0f172a] outline-none focus:border-[#f59e0b]"
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "All Orders" : status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
        <div className="hidden grid-cols-[1.2fr_140px_120px_120px_120px_120px] border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-xs font-semibold uppercase text-[#64748b] md:grid">
          <span>Order ID</span>
          <span>Date</span>
          <span>Items</span>
          <span>Total</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>
        <div className="divide-y divide-[#e2e8f0]">
          {orders.length ? (
            orders.map((order) => (
              <article
                key={order.id}
                className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_140px_120px_120px_120px_120px] md:items-center"
              >
                <div>
                  <p className="text-xs font-semibold uppercase text-[#94a3b8] md:hidden">
                    Order ID
                  </p>
                  <p className="break-all text-sm font-semibold text-[#0f172a]">
                    {order.id}
                  </p>
                </div>
                <div className="text-sm text-[#475569]">{formatDate(order.createdAt)}</div>
                <div className="text-sm text-[#475569]">{order.itemsCount}</div>
                <div className="text-sm font-semibold text-[#0f172a]">
                  {formatCurrency(order.total)}
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="md:text-right">
                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-[#cbd5e1] px-3 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="px-6 py-14 text-center">
              <h2 className="text-base font-semibold text-[#0f172a]">
                No orders found
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Orders matching this status will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
