"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Tag, Trash2 } from "lucide-react";

import { useCart } from "@/lib/cart-context";

type CouponState = {
  code: string;
  appliedCode: string | null;
  discount: number;
  message: string | null;
  isValid: boolean;
  isChecking: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getEstimatedShipping(subtotal: number) {
  if (subtotal <= 0) return 0;
  return subtotal >= 5000 ? 0 : 99;
}

export function CartPageView() {
  const {
    items,
    cartCount,
    subtotal,
    estimatedTax,
    removeItem,
    updateQuantity,
    saveForLater,
    clearCart,
  } = useCart();
  const [coupon, setCoupon] = useState<CouponState>({
    code: "",
    appliedCode: null,
    discount: 0,
    message: null,
    isValid: false,
    isChecking: false,
  });

  const estimatedShipping = getEstimatedShipping(subtotal);
  const discount = Math.min(coupon.discount, subtotal);
  const total = Math.max(0, subtotal - discount + estimatedTax + estimatedShipping);

  const validateCoupon = useCallback(
    async (code: string) => {
      const normalizedCode = code.trim().toUpperCase();

      if (!normalizedCode) {
        setCoupon((current) => ({
          ...current,
          appliedCode: null,
          discount: 0,
          message: null,
          isValid: false,
          isChecking: false,
        }));
        return;
      }

      setCoupon((current) => ({ ...current, isChecking: true }));

      try {
        const response = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: normalizedCode,
            subtotal,
          }),
        });
        const payload = (await response.json()) as {
          valid?: boolean;
          code?: string;
          discount?: number;
          message?: string;
        };
        const isValid = Boolean(payload.valid);
        const nextDiscount =
          isValid && typeof payload.discount === "number" ? payload.discount : 0;

        setCoupon((current) => ({
          ...current,
          appliedCode: isValid ? payload.code ?? normalizedCode : null,
          discount: nextDiscount,
          message: payload.message ?? null,
          isValid,
          isChecking: false,
        }));
      } catch {
        setCoupon((current) => ({
          ...current,
          appliedCode: null,
          discount: 0,
          message: "Coupon validation is unavailable right now.",
          isValid: false,
          isChecking: false,
        }));
      }
    },
    [subtotal]
  );

  useEffect(() => {
    const normalizedCode = coupon.code.trim();

    if (normalizedCode.length < 3) {
      setCoupon((current) => ({
        ...current,
        appliedCode: null,
        discount: 0,
        message: null,
        isValid: false,
        isChecking: false,
      }));
      return;
    }

    const timeout = window.setTimeout(() => {
      validateCoupon(normalizedCode);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [coupon.code, validateCoupon]);

  const itemRows = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        lineTotal: item.unitPrice * item.quantity,
      })),
    [items]
  );

  if (!items.length) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center py-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-[#f1f5f9] text-[#64748b]">
          <ShoppingBag className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-[#0f172a]">
          Your cart is empty
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Start with products you like, then come back here for coupon validation
          and checkout totals.
        </p>
        <Link
          href="/products"
          className="mt-6 rounded-md bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#0f172a]">Shopping Cart</h1>
            <p className="mt-1 text-sm text-[#64748b]">
              {cartCount} items ready for checkout.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-semibold text-[#475569] transition hover:bg-[#f8fafc]"
            onClick={clearCart}
          >
            Clear Cart
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#e2e8f0]">
          <div className="hidden grid-cols-[minmax(260px,1fr)_120px_150px_120px] border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-xs font-semibold uppercase text-[#64748b] md:grid">
            <span>Item</span>
            <span>Unit Price</span>
            <span>Quantity</span>
            <span className="text-right">Total</span>
          </div>

          <div className="divide-y divide-[#e2e8f0]">
            {itemRows.map((item) => (
              <article
                key={item.id}
                className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(260px,1fr)_120px_150px_120px] md:items-center"
              >
                <div className="grid grid-cols-[96px_1fr] gap-4">
                  <Link
                    href={`/products/${item.slug}`}
                    className="relative aspect-square overflow-hidden rounded-md bg-[#f8fafc]"
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.slug}`}
                      className="line-clamp-2 text-sm font-semibold text-[#0f172a] hover:text-[#b45309]"
                    >
                      {item.name}
                    </Link>
                    {item.variant ? (
                      <p className="mt-1 text-sm text-[#64748b]">
                        Variant: {item.variant}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-[#64748b]">
                        Variant: Standard
                      </p>
                    )}
                    {typeof item.stock === "number" ? (
                      <p className="mt-1 text-xs text-[#94a3b8]">
                        {item.stock} available
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#475569] hover:text-[#0f172a]"
                        onClick={() => saveForLater(item.id)}
                      >
                        Save for Later
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#991b1b] hover:text-[#7f1d1d]"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-[#94a3b8] md:hidden">
                    Unit Price
                  </p>
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {formatCurrency(item.unitPrice)}
                  </p>
                  {item.originalPrice && item.originalPrice > item.unitPrice ? (
                    <p className="text-xs text-[#94a3b8] line-through">
                      {formatCurrency(item.originalPrice)}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-[#94a3b8] md:hidden">
                    Quantity
                  </p>
                  <div className="flex h-10 w-fit items-center rounded-md border border-[#cbd5e1]">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="inline-flex size-10 items-center justify-center text-[#64748b] hover:text-[#0f172a]"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-[#0f172a]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="inline-flex size-10 items-center justify-center text-[#64748b] hover:text-[#0f172a]"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="md:text-right">
                  <p className="text-xs font-semibold uppercase text-[#94a3b8] md:hidden">
                    Total
                  </p>
                  <p className="text-sm font-bold text-[#0f172a]">
                    {formatCurrency(item.lineTotal)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <aside className="h-fit rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#0f172a]">Order Summary</h2>

        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-[#0f172a]">
            Coupon code
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={coupon.code}
                onChange={(event) =>
                  setCoupon((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="SAVE10"
                className="h-10 w-full rounded-md border border-[#cbd5e1] pl-9 pr-3 text-sm uppercase outline-none transition focus:border-[#f59e0b]"
              />
            </div>
            <button
              type="button"
              className="h-10 rounded-md bg-[#0f172a] px-4 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={coupon.isChecking || coupon.code.trim().length < 3}
              onClick={() => validateCoupon(coupon.code)}
            >
              Apply
            </button>
          </div>
          {coupon.message ? (
            <p
              className={`text-sm ${
                coupon.isValid ? "text-[#166534]" : "text-[#991b1b]"
              }`}
            >
              {coupon.message}
            </p>
          ) : coupon.isChecking ? (
            <p className="text-sm text-[#64748b]">Checking coupon...</p>
          ) : null}
        </div>

        <div className="mt-5 space-y-3 border-t border-[#e2e8f0] pt-5 text-sm">
          <div className="flex justify-between text-[#475569]">
            <span>Subtotal</span>
            <span className="font-semibold text-[#0f172a]">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-[#475569]">
            <span>Discount</span>
            <span className="font-semibold text-[#166534]">
              -{formatCurrency(discount)}
            </span>
          </div>
          <div className="flex justify-between text-[#475569]">
            <span>Tax</span>
            <span className="font-semibold text-[#0f172a]">
              {formatCurrency(estimatedTax)}
            </span>
          </div>
          <div className="flex justify-between text-[#475569]">
            <span>Estimated shipping</span>
            <span className="font-semibold text-[#0f172a]">
              {estimatedShipping === 0 ? "Free" : formatCurrency(estimatedShipping)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[#e2e8f0] pt-5">
          <span className="text-base font-semibold text-[#0f172a]">Total</span>
          <span className="text-xl font-bold text-[#0f172a]">
            {formatCurrency(total)}
          </span>
        </div>

        <Link
          href="/checkout"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#f59e0b] px-4 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24]"
        >
          Proceed to Checkout
        </Link>
      </aside>
    </div>
  );
}
