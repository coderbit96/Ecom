import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { OrderDetailActions } from "@/components/admin/order-detail-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { FALLBACK_IMAGE } from "@/lib/admin/data";
import { formatCurrency, formatDateTime } from "@/lib/admin/format";
import { db } from "@/lib/db";

const STATUS_STEPS = ["PROCESSING", "CONFIRMED", "SHIPPED", "DELIVERED"];

const orderDetailInclude = {
  user: true,
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
} satisfies Prisma.OrderInclude;

type AdminOrderDetail = Prisma.OrderGetPayload<{
  include: typeof orderDetailInclude;
}>;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order: AdminOrderDetail | null = await db.order.findUnique({
    where: { id: params.id },
    include: orderDetailInclude,
  });

  if (!order) notFound();

  const logs = await db.activityLog.findMany({
    where: {
      userId: order.userId,
      action: { in: ["ORDER_CREATED", "ORDER_STATUS_UPDATED", "ORDER_REFUNDED"] },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Order Info</h2>
          <p className="text-sm text-slate-500">ID</p>
          <p className="font-medium">{order.id}</p>
          <p className="mt-3 text-sm text-slate-500">Date</p>
          <p className="font-medium">{formatDateTime(order.createdAt)}</p>
          <p className="mt-3 text-sm text-slate-500">Channel</p>
          <p className="font-medium">Web store</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Customer Info</h2>
          <p className="font-medium">{order.user.name ?? "Unnamed user"}</p>
          <a className="block text-sm text-blue-700 hover:underline" href={`mailto:${order.user.email}`}>{order.user.email}</a>
          {order.user.phone ? (
            <a className="block text-sm text-blue-700 hover:underline" href={`tel:${order.user.phone}`}>{order.user.phone}</a>
          ) : (
            <p className="text-sm text-slate-500">No phone</p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Payment Info</h2>
          <p className="text-sm">Method: <span className="font-medium">{order.payments[0]?.method ?? "N/A"}</span></p>
          <p className="text-sm">Transaction: <span className="font-medium">{order.payments[0]?.gatewayTxnId ?? order.payments[0]?.razorpayPaymentId ?? "N/A"}</span></p>
          <p className="text-sm">Amount: <span className="font-medium">{formatCurrency(order.payments[0]?.amount ?? order.total)}</span></p>
          <div className="mt-2"><StatusBadge value={order.payments[0]?.status ?? "PENDING"} /></div>
          {order.payments[0]?.qrRef ? <p className="mt-2 text-sm text-slate-500">QR ref: {order.payments[0].qrRef}</p> : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Delivery Address</h2>
        <p className="font-medium">{order.address.label}</p>
        <p className="text-sm text-slate-600">{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}</p>
        <p className="text-sm text-slate-600">{order.address.city}, {order.address.state} {order.address.pincode}</p>
        <p className="text-sm text-slate-600">{order.address.country}</p>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-base font-semibold">Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.product.images[0]?.url ?? FALLBACK_IMAGE} alt="" className="size-11 rounded-md object-cover" />
                      <span className="font-medium">{item.product.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.variant ? `${item.variant.name}: ${item.variant.value}` : "N/A"}</td>
                  <td className="px-4 py-3">{item.qty}</td>
                  <td className="px-4 py-3">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Order Status Timeline</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {STATUS_STEPS.map((step) => {
            const complete = STATUS_STEPS.indexOf(step) <= STATUS_STEPS.indexOf(order.status);
            return (
              <div key={step} className={`rounded-lg border p-3 ${complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <p className="font-medium">{step}</p>
                <p className="text-xs text-slate-500">{complete ? "Completed or current" : "Pending"}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="text-sm text-slate-600">
              {formatDateTime(log.createdAt)} · {log.action.replaceAll("_", " ")}
            </div>
          ))}
        </div>
      </section>

      <OrderDetailActions orderId={order.id} currentStatus={order.status} total={order.total} />
    </div>
  );
}
