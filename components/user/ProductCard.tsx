"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

const RECENTLY_VIEWED_STORAGE_KEY = "ecom_recently_viewed";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  discountPct: number;
  rating: number;
  ratingCount: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function renderStars(rating: number) {
  const rounded = Math.round(rating);
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={`h-4 w-4 ${
        index < rounded ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#cbd5e1]"
      }`}
    />
  ));
}

type ProductCardProps = {
  product: ProductCardData;
  variant?: "grid" | "list";
};

export function ProductCard({ product, variant = "grid" }: ProductCardProps) {
  const { addItem } = useCart();
  const isList = variant === "list";

  const hasDiscount = product.discountPct > 0;
  const discountedPrice = hasDiscount
    ? product.price * (1 - product.discountPct / 100)
    : product.price;

  const saveRecentlyViewed = () => {
    const saved = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    const current = saved ? (JSON.parse(saved) as string[]) : [];
    const next = [product.id, ...current.filter((id) => id !== product.id)].slice(
      0,
      20
    );

    localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <article
      className={cn(
        "shrink-0 rounded-lg border border-[#e2e8f0] bg-white p-3 shadow-sm transition hover:shadow-md",
        isList ? "w-full md:flex md:gap-4" : "w-[230px]"
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className={cn("block", isList && "md:w-40 md:shrink-0")}
        onClick={saveRecentlyViewed}
      >
        <div
          className={cn(
            "relative mb-3 aspect-[4/5] overflow-hidden rounded-md bg-[#f8fafc]",
            isList && "md:mb-0 md:h-44 md:aspect-auto"
          )}
        >
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes={isList ? "160px" : "230px"}
            className="object-cover"
            unoptimized
          />
          {hasDiscount ? (
            <span className="absolute left-2 top-2 rounded bg-[#dc2626] px-2 py-1 text-xs font-semibold text-white">
              {Math.round(product.discountPct)}% OFF
            </span>
          ) : null}
        </div>
      </Link>

      <div className={cn(isList && "min-w-0 flex-1 py-1")}>
        <h3
          className={cn(
            "line-clamp-2 text-sm font-medium text-[#0f172a]",
            isList && "md:text-base"
          )}
        >
          {product.name}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-[#0f172a]">
            {formatCurrency(discountedPrice)}
          </span>
          {hasDiscount ? (
            <span className="text-xs text-[#94a3b8] line-through">
              {formatCurrency(product.price)}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-1">
          {renderStars(product.rating)}
          <span className="ml-1 text-xs text-[#64748b]">({product.ratingCount})</span>
        </div>

        <button
          type="button"
          onClick={() =>
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              imageUrl: product.imageUrl,
              variant: null,
              variantId: null,
              unitPrice: discountedPrice,
              originalPrice: hasDiscount ? product.price : null,
              quantity: 1,
            })
          }
          className={cn(
            "mt-3 w-full rounded-md bg-[#f59e0b] px-3 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#fbbf24]",
            isList && "md:w-auto md:min-w-36"
          )}
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
}
