"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartOff, ShoppingBag, Trash2 } from "lucide-react";

import { ProductCard, type ProductCardData } from "@/components/user/ProductCard";

type WishlistItem = {
  wishlistId: string;
  product: ProductCardData;
};

export function WishlistView({
  initialItems,
}: {
  initialItems: WishlistItem[];
}) {
  const [items, setItems] = useState(initialItems);

  async function removeFromWishlist(productId: string) {
    const response = await fetch(`/api/wishlist?productId=${productId}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    const payload = (await response.json().catch(() => null)) as {
      count?: number;
    } | null;

    if (response.ok) {
      setItems((current) =>
        current.filter((item) => item.product.id !== productId)
      );
      window.dispatchEvent(
        new CustomEvent("wishlist:updated", {
          detail: { count: payload?.count ?? Math.max(0, items.length - 1) },
        })
      );
    }
  }

  if (!items.length) {
    return (
      <section className="mx-auto max-w-xl py-20 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#f1f5f9] text-[#94a3b8]">
          <HeartOff className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-[#0f172a]">
          Your wishlist is empty
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Save products you love and come back when you are ready to buy.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f172a] px-4 text-sm font-semibold text-white"
        >
          <ShoppingBag className="h-4 w-4" />
          Browse Products
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Wishlist</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          {items.length} saved products.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.wishlistId} className="relative w-[230px]">
            <button
              type="button"
              aria-label="Remove from wishlist"
              title="Remove from wishlist"
              className="absolute right-2 top-2 z-10 inline-flex size-9 items-center justify-center rounded-md bg-white/95 text-[#991b1b] shadow-sm transition hover:bg-[#fef2f2]"
              onClick={() => removeFromWishlist(item.product.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <ProductCard product={item.product} />
          </div>
        ))}
      </div>
    </div>
  );
}
