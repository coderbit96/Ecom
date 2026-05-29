import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderDetailActions } from "@/components/user/order-detail-actions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CANCELLABLE_STATUSES,
  ORDER_STATUS_STEPS,
  formatCurrency,
  formatDate,
  getOrderImage,
  getStatusClassName,
  getTrackingNumber,
  isReturnEligible,
} from "@/lib/order-utils";

type OrderDetailPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  return {
    title: `Order ${params.id} | Premium Commerce`,
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const order = await db.order
    .findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
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
    })
    .catch(() => null);

  if (!order) {
    notFound();
  }

  const payment = order.payments[0];
  const currentStepIndex = ORDER_STATUS_STEPS.indexOf(order.status);
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const canReturn = isReturnEligible(order);
  const showTracking = order.status === "SHIPPED" || order.status === "DELIVERED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/orders" className="text-sm font-semibold text-[#64748b]">
            Back to orders
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#0f172a]">
            Order {order.id}
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClassName(
            order.status
          )}`}
        >
          {order.status}
        </span>
      </div>

      <OrderDetailActions
        orderId={order.id}
        canCancel={canCancel}
        canReturn={canReturn}
      />

      <section className="rounded-lg border border-[#e2e8f0] bg-white shadow-sm">
        <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#0f172a]">
          Items
        </div>
        <div className="divide-y divide-[#e2e8f0]">
          {order.items.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 px-4 py-4 md:grid-cols-[88px_1fr_140px_140px] md:items-center"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-[#f8fafc]">
                <Image
                  src={getOrderImage(item)}
                  alt={item.product.title}
                  fill
                  sizes="88px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0f172a]">
                  {item.product.title}
                </h2>
                {item.variant ? (
                  <p className="mt-1 text-sm text-[#64748b]">
                    {item.variant.name}: {item.variant.value}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-[#64748b]">Qty {item.qty}</p>
              </div>
              <div className="text-sm text-[#475569]">
                {formatCurrency(item.unitPrice)} each
              </div>
              <div className="text-sm font-bold text-[#0f172a] md:text-right">
                {formatCurrency(item.totalPrice)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0f172a]">
            Delivery Address
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#64748b]">
            {order.address.label}
            <br />
            {order.address.line1}
            {order.address.line2 ? `, ${order.address.line2}` : ""}
            <br />
            {order.address.city}, {order.address.state} {order.address.pincode}
          </p>
          <p className="mt-3 text-sm font-semibold text-[#0f172a]">
            {order.shippingMethod ?? "Standard Delivery"}
          </p>
          {order.estimatedDelivery ? (
            <p className="mt-1 text-sm text-[#64748b]">
              Estimated delivery: {formatDate(order.estimatedDelivery)}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0f172a]">
            Payment Details
          </h2>
          <div className="mt-3 space-y-2 text-sm text-[#64748b]">
            <p>Method: {payment?.method ?? "N/A"}</p>
            <p>Transaction ID: {payment?.gatewayTxnId ?? payment?.qrRef ?? "N/A"}</p>
            <p>Date: {payment?.paidAt ? formatDate(payment.paidAt) : "Pending"}</p>
            <p>Status: {payment?.status ?? "PENDING"}</p>
          </div>
        </section>

        <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0f172a]">Price Summary</h2>
          <div className="mt-3 space-y-2 text-sm">
            <PriceLine label="Subtotal" value={formatCurrency(order.subtotal)} />
            <PriceLine label="Discount" value={`-${formatCurrency(order.discount)}`} />
            <PriceLine label="Tax" value={formatCurrency(order.tax)} />
            <PriceLine label="Shipping" value={formatCurrency(order.shipping)} />
            <div className="flex justify-between border-t border-[#e2e8f0] pt-2 font-bold text-[#0f172a]">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#0f172a]">
          Order Status Timeline
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {ORDER_STATUS_STEPS.map((status, index) => {
            const isDone = currentStepIndex >= index;

            return (
              <div key={status} className="flex items-center gap-3">
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? "bg-[#16a34a] text-white"
                      : "bg-[#f1f5f9] text-[#94a3b8]"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-[#0f172a]">
                  {status}
                </span>
              </div>
            );
          })}
        </div>
        {showTracking ? (
          <div className="mt-5 rounded-md bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
            Tracking number:{" "}
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(
                getTrackingNumber(order)
              )}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#0f172a] underline-offset-4 hover:underline"
            >
              {getTrackingNumber(order)}
            </a>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#64748b]">
      <span>{label}</span>
      <span className="font-semibold text-[#0f172a]">{value}</span>
    </div>
  );
}
