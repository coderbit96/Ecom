"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function OrderDetailActions({
  orderId,
  canCancel,
  canReturn,
}: {
  orderId: string;
  canCancel: boolean;
  canReturn: boolean;
}) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function cancelOrder() {
    setIsCancelling(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to cancel order.");
      }

      router.refresh();
      setMessage("Order cancelled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to cancel order.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canCancel ? (
        <button
          type="button"
          disabled={isCancelling}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#fecaca] px-4 text-sm font-semibold text-[#991b1b] transition hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={cancelOrder}
        >
          {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Cancel Order
        </button>
      ) : null}
      {canReturn ? (
        <button
          type="button"
          className="h-10 rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
        >
          Request Return
        </button>
      ) : null}
      <a
        href={`/api/orders/${orderId}/invoice`}
        className="inline-flex h-10 items-center justify-center rounded-md bg-[#0f172a] px-4 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
      >
        Download Invoice
      </a>
      {message ? <p className="text-sm text-[#64748b]">{message}</p> : null}
    </div>
  );
}
