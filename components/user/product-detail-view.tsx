"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from "lucide-react";

import { ProductCard, type ProductCardData } from "@/components/user/ProductCard";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

export type ProductDetailImage = {
  id: string;
  url: string;
  alt: string;
};

export type ProductVariantOption = {
  id: string;
  label: string;
  value: string;
  stock: number;
  extraPrice: number;
  swatch?: string;
};

export type ProductReviewItem = {
  id: string;
  userName: string;
  avatarUrl: string | null;
  rating: number;
  date: string;
  comment: string;
  isVerified: boolean;
};

export type ProductDetailData = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: {
    name: string;
    slug: string;
  };
  brand: string;
  sku: string;
  price: number;
  discountPct: number;
  stock: number;
  images: ProductDetailImage[];
  colors: ProductVariantOption[];
  sizes: ProductVariantOption[];
  specifications: Array<{ label: string; value: string }>;
  rating: number;
  reviewCount: number;
  ratingBreakdown: Array<{ rating: number; count: number }>;
  reviews: ProductReviewItem[];
  frequentlyBoughtTogether: ProductCardData[];
  relatedProducts: ProductCardData[];
  canWriteReview: boolean;
};

type ProductDetailViewProps = {
  product: ProductDetailData;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDeliveryDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function renderStars(rating: number, size = "h-4 w-4") {
  const rounded = Math.round(rating);

  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={cn(
        size,
        index < rounded ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#cbd5e1]"
      )}
    />
  ));
}

function getEffectiveStock(
  baseStock: number,
  selectedColor?: ProductVariantOption,
  selectedSize?: ProductVariantOption
) {
  const variantStocks = [selectedColor?.stock, selectedSize?.stock].filter(
    (stock): stock is number => typeof stock === "number"
  );

  if (!variantStocks.length) return baseStock;

  return Math.min(baseStock, ...variantStocks);
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const { addItem } = useCart();
  const [activeImageId, setActiveImageId] = useState(product.images[0]?.id);
  const [selectedColorId, setSelectedColorId] = useState(product.colors[0]?.id);
  const [selectedSizeId, setSelectedSizeId] = useState(product.sizes[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "specifications">(
    "description"
  );
  const [pincode, setPincode] = useState("");
  const [deliveryEstimate, setDeliveryEstimate] = useState<string | null>(null);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");

  const selectedColor = product.colors.find((color) => color.id === selectedColorId);
  const selectedSize = product.sizes.find((size) => size.id === selectedSizeId);
  const activeImage =
    product.images.find((image) => image.id === activeImageId) ?? product.images[0];
  const hasDiscount = product.discountPct > 0;
  const selectedExtraPrice =
    (selectedColor?.extraPrice ?? 0) + (selectedSize?.extraPrice ?? 0);
  const originalPrice = product.price + selectedExtraPrice;
  const discountedPrice = hasDiscount
    ? originalPrice * (1 - product.discountPct / 100)
    : originalPrice;
  const effectiveStock = getEffectiveStock(product.stock, selectedColor, selectedSize);
  const maxQuantity = Math.max(1, effectiveStock);
  const fbtTotal = useMemo(() => {
    const current = discountedPrice;
    const addOns = product.frequentlyBoughtTogether.reduce((sum, item) => {
      const price =
        item.discountPct > 0 ? item.price * (1 - item.discountPct / 100) : item.price;

      return sum + price;
    }, 0);

    return current + addOns;
  }, [discountedPrice, product.frequentlyBoughtTogether]);

  useEffect(() => {
    setQuantity((current) => Math.min(current, maxQuantity));
  }, [maxQuantity]);

  const updateDeliveryEstimate = () => {
    if (!/^\d{6}$/.test(pincode)) {
      setDeliveryEstimate("Enter a valid 6-digit pincode");
      return;
    }

    const deliveryDays = 3 + (Number(pincode.slice(-1)) % 4);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
    setDeliveryEstimate(`Estimated delivery by ${formatDeliveryDate(deliveryDate)}`);
  };

  const addToCart = () => {
    if (effectiveStock <= 0) return;

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.title,
      imageUrl: activeImage?.url ?? product.images[0]?.url ?? "",
      variantId: [selectedColor?.id, selectedSize?.id].filter(Boolean).join(":"),
      variant: [selectedColor?.label, selectedSize?.label].filter(Boolean).join(" / "),
      unitPrice: discountedPrice,
      originalPrice: hasDiscount ? originalPrice : null,
      quantity,
      stock: effectiveStock,
    });
  };

  const toggleWishlist = async () => {
    const nextWishlisted = !isWishlisted;
    setIsWishlisted(nextWishlisted);

    const response = await fetch("/api/wishlist", {
      method: nextWishlisted ? "POST" : "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId: product.id }),
    });
    const payload = (await response.json().catch(() => null)) as {
      count?: number;
    } | null;

    if (!response.ok) {
      setIsWishlisted(!nextWishlisted);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("wishlist:updated", {
        detail: { count: payload?.count },
      })
    );
  };

  const scrollToReviews = () => {
    document.getElementById("customer-reviews")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const stockBadge =
    effectiveStock <= 0
      ? { label: "Out of Stock", className: "bg-[#fee2e2] text-[#991b1b]" }
      : effectiveStock <= 5
        ? { label: `Only ${effectiveStock} left`, className: "bg-[#ffedd5] text-[#9a3412]" }
        : { label: "In Stock", className: "bg-[#dcfce7] text-[#166534]" };

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="min-w-0 space-y-4">
          <div
            className="group relative aspect-square overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / rect.width) * 100;
              const y = ((event.clientY - rect.top) / rect.height) * 100;
              setZoomOrigin(`${x}% ${y}%`);
            }}
            onMouseLeave={() => setZoomOrigin("50% 50%")}
          >
            {activeImage ? (
              <Image
                src={activeImage.url}
                alt={activeImage.alt}
                fill
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-cover transition duration-300 group-hover:scale-125"
                style={{ transformOrigin: zoomOrigin }}
                priority
                unoptimized
              />
            ) : null}
          </div>

          <div className="grid grid-cols-5 gap-3 sm:grid-cols-6">
            {product.images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImageId(image.id)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-md border bg-[#f8fafc]",
                  image.id === activeImage?.id
                    ? "border-[#f59e0b] ring-2 ring-[#fde68a]"
                    : "border-[#e2e8f0] hover:border-[#f59e0b]"
                )}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-[#64748b]">
            <Link href="/" className="hover:text-[#0f172a]">
              Home
            </Link>
            <span>/</span>
            <Link
              href={`/category/${product.category.slug}`}
              className="hover:text-[#0f172a]"
            >
              {product.category.name}
            </Link>
            <span>/</span>
            <span className="max-w-[260px] truncate text-[#0f172a]">
              {product.title}
            </span>
          </nav>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-[#f1f5f9] px-2.5 py-1 text-xs font-semibold text-[#334155]">
                {product.brand}
              </span>
              <span className="text-xs font-medium uppercase text-[#94a3b8]">
                SKU: {product.sku}
              </span>
            </div>
            <h1 className="text-3xl font-semibold text-[#0f172a] md:text-4xl">
              {product.title}
            </h1>
            <button
              type="button"
              onClick={scrollToReviews}
              className="flex items-center gap-2 text-sm text-[#475569] hover:text-[#0f172a]"
            >
              <span className="flex items-center gap-0.5">
                {renderStars(product.rating)}
              </span>
              <span className="font-semibold">{product.rating.toFixed(1)}</span>
              <span>({product.reviewCount} reviews)</span>
            </button>
          </div>

          <div className="space-y-2 border-y border-[#e2e8f0] py-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-3xl font-bold text-[#0f172a]">
                {formatCurrency(discountedPrice)}
              </span>
              {hasDiscount ? (
                <>
                  <span className="text-lg text-[#94a3b8] line-through">
                    {formatCurrency(originalPrice)}
                  </span>
                  <span className="rounded bg-[#dc2626] px-2.5 py-1 text-xs font-semibold text-white">
                    {Math.round(product.discountPct)}% OFF
                  </span>
                </>
              ) : null}
            </div>
            <span
              className={cn(
                "inline-flex rounded px-2.5 py-1 text-xs font-semibold",
                stockBadge.className
              )}
            >
              {stockBadge.label}
            </span>
          </div>

          <div className="space-y-5">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#0f172a]">Color</h2>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => {
                  const isDisabled = color.stock <= 0 || product.stock <= 0;

                  return (
                    <button
                      key={color.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedColorId(color.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
                        selectedColorId === color.id
                          ? "border-[#0f172a] text-[#0f172a]"
                          : "border-[#cbd5e1] text-[#475569] hover:border-[#94a3b8]",
                        isDisabled && "cursor-not-allowed opacity-40"
                      )}
                    >
                      <span
                        className="size-4 rounded-full border border-[#cbd5e1]"
                        style={{ backgroundColor: color.swatch }}
                      />
                      {color.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[#0f172a]">Size</h2>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const isDisabled = size.stock <= 0 || product.stock <= 0;

                  return (
                    <button
                      key={size.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedSizeId(size.id)}
                      className={cn(
                        "min-w-12 rounded-md border px-3 py-2 text-sm font-semibold transition",
                        selectedSizeId === size.id
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-[#cbd5e1] text-[#475569] hover:border-[#94a3b8]",
                        isDisabled && "cursor-not-allowed bg-[#f1f5f9] text-[#94a3b8] line-through"
                      )}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 items-center rounded-md border border-[#cbd5e1]">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="flex size-11 items-center justify-center text-[#64748b] hover:text-[#0f172a]"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold text-[#0f172a]">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQuantity((current) => Math.min(maxQuantity, current + 1))
                  }
                  className="flex size-11 items-center justify-center text-[#64748b] hover:text-[#0f172a]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                disabled={effectiveStock <= 0}
                onClick={addToCart}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#f59e0b] px-5 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </button>
              <button
                type="button"
                onClick={toggleWishlist}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isWishlisted && "fill-[#dc2626] text-[#dc2626]"
                  )}
                />
                Add to Wishlist
              </button>
            </div>

            <div className="rounded-lg border border-[#e2e8f0] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                <Truck className="h-4 w-4 text-[#f59e0b]" />
                Delivery estimator
              </div>
              <div className="flex gap-2">
                <input
                  value={pincode}
                  onChange={(event) => setPincode(event.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter pincode"
                  className="h-10 min-w-0 flex-1 rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#f59e0b]"
                />
                <button
                  type="button"
                  onClick={updateDeliveryEstimate}
                  className="h-10 rounded-md bg-[#0f172a] px-4 text-sm font-semibold text-white"
                >
                  Check
                </button>
              </div>
              {deliveryEstimate ? (
                <p className="mt-2 text-sm text-[#475569]">{deliveryEstimate}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e2e8f0] py-6">
        <div className="mb-5 flex gap-2">
          {(["description", "specifications"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold capitalize transition",
                activeTab === tab
                  ? "bg-[#0f172a] text-white"
                  : "bg-[#f8fafc] text-[#475569] hover:bg-[#e2e8f0]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === "description" ? (
          <p className="max-w-4xl whitespace-pre-line text-sm leading-7 text-[#475569]">
            {product.description}
          </p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.specifications.map((spec) => (
              <div
                key={`${spec.label}-${spec.value}`}
                className="rounded-md border border-[#e2e8f0] p-3"
              >
                <dt className="text-xs font-semibold uppercase text-[#94a3b8]">
                  {spec.label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-[#0f172a]">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {product.frequentlyBoughtTogether.length ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#0f172a]">
                Frequently Bought Together
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Bundle this item with popular picks from the same category.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-[#64748b]">Bundle total</p>
              <p className="text-lg font-bold text-[#0f172a]">
                {formatCurrency(fbtTotal)}
              </p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {product.frequentlyBoughtTogether.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      {product.relatedProducts.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[#0f172a]">You May Also Like</h2>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {product.relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section id="customer-reviews" className="scroll-mt-24 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#0f172a]">Customer Reviews</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              {product.reviewCount} reviews with an average of {product.rating.toFixed(1)}.
            </p>
          </div>
          {product.canWriteReview ? (
            <button
              type="button"
              className="rounded-md bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white"
            >
              Write a Review
            </button>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-lg border border-[#e2e8f0] p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-4xl font-bold text-[#0f172a]">
                {product.rating.toFixed(1)}
              </span>
              <span className="space-y-1">
                <span className="flex items-center gap-0.5">
                  {renderStars(product.rating)}
                </span>
                <span className="block text-xs text-[#64748b]">
                  Based on {product.reviewCount} reviews
                </span>
              </span>
            </div>
            <div className="space-y-2">
              {product.ratingBreakdown.map((item) => {
                const percent = product.reviewCount
                  ? Math.round((item.count / product.reviewCount) * 100)
                  : 0;

                return (
                  <div key={item.rating} className="grid grid-cols-[36px_1fr_36px] items-center gap-2">
                    <span className="text-xs font-semibold text-[#475569]">
                      {item.rating}★
                    </span>
                    <div className="h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
                      <div
                        className="h-full rounded-full bg-[#f59e0b]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-right text-xs text-[#64748b]">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {product.reviews.length ? (
              product.reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-lg border border-[#e2e8f0] p-4"
                >
                  <div className="flex gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-[#e2e8f0]">
                      {review.avatarUrl ? (
                        <Image
                          src={review.avatarUrl}
                          alt={review.userName}
                          fill
                          sizes="40px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-sm font-bold text-[#475569]">
                          {review.userName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#0f172a]">
                          {review.userName}
                        </h3>
                        {review.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#166534]">
                            <ShieldCheck className="h-3 w-3" />
                            Verified Purchase
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          {renderStars(review.rating, "h-3.5 w-3.5")}
                        </span>
                        <span className="text-xs text-[#94a3b8]">{review.date}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#475569]">
                        {review.comment}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-[#cbd5e1] px-6 py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-[#94a3b8]" />
                <h3 className="mt-3 text-sm font-semibold text-[#0f172a]">
                  No reviews yet
                </h3>
                <p className="mt-1 text-sm text-[#64748b]">
                  Be the first customer to share a review for this product.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
