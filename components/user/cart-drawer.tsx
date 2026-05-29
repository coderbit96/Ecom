"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

import { useCart } from "@/lib/cart-context";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function CartDrawer() {
  const {
    items,
    subtotal,
    estimatedTax,
    cartCount,
    isDrawerOpen,
    closeCart,
    removeItem,
    updateQuantity,
    saveForLater,
  } = useCart();

  return (
    <div
      className={`fixed inset-0 z-[70] transition ${
        isDrawerOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!isDrawerOpen}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          isDrawerOpen ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Close cart"
        onClick={closeCart}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex h-16 items-center justify-between border-b border-[#e2e8f0] px-4">
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">Cart</h2>
            <p className="text-sm text-[#64748b]">{cartCount} items</p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            aria-label="Close cart"
            onClick={closeCart}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="grid grid-cols-[88px_1fr] gap-3 border-b border-[#e2e8f0] pb-4 last:border-0"
                >
                  <Link
                    href={`/products/${item.slug}`}
                    className="relative aspect-square overflow-hidden rounded-md bg-[#f8fafc]"
                    onClick={closeCart}
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="88px"
                      className="object-cover"
                      unoptimized
                    />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${item.slug}`}
                          className="line-clamp-2 text-sm font-semibold text-[#0f172a] hover:text-[#b45309]"
                          onClick={closeCart}
                        >
                          {item.name}
                        </Link>
                        {item.variant ? (
                          <p className="mt-1 text-xs text-[#64748b]">
                            {item.variant}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[#94a3b8] transition hover:bg-[#fee2e2] hover:text-[#991b1b]"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex h-9 items-center rounded-md border border-[#cbd5e1]">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          className="inline-flex size-9 items-center justify-center text-[#64748b] hover:text-[#0f172a]"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-sm font-semibold text-[#0f172a]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          className="inline-flex size-9 items-center justify-center text-[#64748b] hover:text-[#0f172a]"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#0f172a]">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </p>
                        <p className="text-xs text-[#64748b]">
                          {formatCurrency(item.unitPrice)} each
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-3 text-xs font-semibold text-[#475569] underline-offset-4 hover:text-[#0f172a] hover:underline"
                      onClick={() => saveForLater(item.id)}
                    >
                      Save for Later
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-[#f1f5f9] text-[#64748b]">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-[#0f172a]">
              Your cart is empty
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              Add a product to review pricing, tax, and checkout options here.
            </p>
            <Link
              href="/products"
              className="mt-5 rounded-md bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white"
              onClick={closeCart}
            >
              Browse Products
            </Link>
          </div>
        )}

        <div className="border-t border-[#e2e8f0] p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#475569]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#0f172a]">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Estimated tax</span>
              <span className="font-semibold text-[#0f172a]">
                {formatCurrency(estimatedTax)}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/cart"
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#cbd5e1] px-3 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
              onClick={closeCart}
            >
              View Full Cart
            </Link>
            <Link
              href="/checkout"
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#f59e0b] px-3 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24]"
              onClick={closeCart}
            >
              Checkout
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
