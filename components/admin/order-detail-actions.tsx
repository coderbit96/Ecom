"use client";

import { Printer, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const STATUSES = [
  "PROCESSING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export function OrderDetailActions({
  orderId,
  currentStatus,
  total,
}: {
  orderId: string;
  currentStatus: string;
  total: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [refundAmount, setRefundAmount] = useState(total);
  const [refundReason, setRefundReason] = useState("Customer request");
  const [pending, setPending] = useState(false);

  async function updateStatus() {
    setPending(true);
    await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingNumber }),
    });
    setPending(false);
    router.refresh();
  }

  async function refund() {
    if (!window.confirm(`Issue refund of ₹${refundAmount.toFixed(2)}?`)) return;
    setPending(true);
    await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: refundAmount, reason: refundReason }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Status Update</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {status === "SHIPPED" ? (
            <input
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="Tracking number"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
            />
          ) : null}
        </div>
        <Button className="mt-3" type="button" disabled={pending} onClick={updateStatus}>
          <Truck className="size-4" />
          Update
        </Button>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Refund</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
            type="number"
            max={total}
            min={0}
            value={refundAmount}
            onChange={(event) => setRefundAmount(Number(event.target.value))}
          />
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={refundReason}
            onChange={(event) => setRefundReason(event.target.value)}
          >
            <option>Customer request</option>
            <option>Damaged item</option>
            <option>Payment adjustment</option>
            <option>Order cancellation</option>
          </select>
        </div>
        <Button className="mt-3" type="button" variant="outline" disabled={pending} onClick={refund}>
          Issue Refund
        </Button>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h2 className="mb-4 text-base font-semibold">Documents</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print Invoice
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print Packing Slip
          </Button>
          <a
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2.5 text-sm font-medium hover:bg-slate-50"
            href={`/api/admin/orders/${orderId}/invoice`}
          >
            Download PDF
          </a>
        </div>
      </section>
    </div>
  );
}
