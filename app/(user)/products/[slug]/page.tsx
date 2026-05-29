import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailView, type ProductDetailData } from "@/components/user/product-detail-view";
import type { ProductCardData } from "@/components/user/ProductCard";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type ProductDetailPageProps = {
  params: {
    slug: string;
  };
};

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80";

const COLOR_SWATCHES: Record<string, string> = {
  black: "#111827",
  blue: "#2563eb",
  brown: "#92400e",
  cream: "#f5f5dc",
  gray: "#6b7280",
  green: "#16a34a",
  grey: "#6b7280",
  navy: "#1e3a8a",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#7c3aed",
  red: "#dc2626",
  silver: "#c0c0c0",
  white: "#ffffff",
  yellow: "#eab308",
};

type ProductWithImages = {
  id: string;
  title: string;
  slug: string;
  price: number;
  discountPct: number;
  images: Array<{ url: string; isPrimary: boolean; order: number }>;
};

function getColorSwatch(value: string) {
  const normalized = value.toLowerCase().trim();
  if (COLOR_SWATCHES[normalized]) return COLOR_SWATCHES[normalized];

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash);
  }

  return `hsl(${Math.abs(hash) % 360} 65% 48%)`;
}

function mapProductCard(
  product: ProductWithImages,
  reviewMap: Map<string, { rating: number; count: number }>
): ProductCardData {
  const imageUrl =
    product.images.find((image) => image.isPrimary)?.url ??
    product.images[0]?.url ??
    FALLBACK_PRODUCT_IMAGE;
  const review = reviewMap.get(product.id);

  return {
    id: product.id,
    name: product.title,
    slug: product.slug,
    imageUrl,
    price: product.price,
    discountPct: product.discountPct,
    rating: review?.rating ?? 0,
    ratingCount: review?.count ?? 0,
  };
}

function getVariantValue(
  variants: Array<{ name: string; value: string }>,
  matcher: string
) {
  return variants.find((variant) =>
    variant.name.toLowerCase().includes(matcher)
  )?.value;
}

function buildVariantOptions(
  variants: Array<{
    id: string;
    name: string;
    value: string;
    stock: number;
    extraPrice: number;
  }>,
  matcher: string,
  fallback: {
    id: string;
    label: string;
    stock: number;
    extraPrice?: number;
    swatch?: string;
  }
) {
  const matchingVariants = variants.filter((variant) =>
    variant.name.toLowerCase().includes(matcher)
  );

  const unique = new Map<string, (typeof matchingVariants)[number]>();
  matchingVariants.forEach((variant) => {
    if (!unique.has(variant.value.toLowerCase())) {
      unique.set(variant.value.toLowerCase(), variant);
    }
  });

  if (!unique.size) {
    return [
      {
        id: fallback.id,
        label: fallback.label,
        value: fallback.label,
        stock: fallback.stock,
        extraPrice: fallback.extraPrice ?? 0,
        swatch: fallback.swatch,
      },
    ];
  }

  return Array.from(unique.values()).map((variant) => ({
    id: variant.id,
    label: variant.value,
    value: variant.value,
    stock: variant.stock,
    extraPrice: variant.extraPrice,
    swatch: matcher === "color" ? getColorSwatch(variant.value) : undefined,
  }));
}

function formatReviewDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      description: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
        take: 1,
        select: {
          url: true,
        },
      },
    },
  });

  if (!product) {
    return {
      title: "Product not found",
    };
  }

  return {
    title: product.title,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.description,
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const session = await auth();

  const product = await db.product.findUnique({
    where: { slug: params.slug },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      images: {
        orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
      },
      variants: {
        orderBy: [{ name: "asc" }, { value: "asc" }],
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!product || product.status !== "PUBLISHED") {
    notFound();
  }

  const [relatedRaw, deliveredOrderItem, existingReview] = await Promise.all([
    db.product.findMany({
      where: {
        id: { not: product.id },
        categoryId: product.categoryId,
        status: "PUBLISHED",
      },
      orderBy: [{ discountPct: "desc" }, { createdAt: "desc" }],
      include: {
        images: {
          orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
        },
      },
      take: 10,
    }),
    session?.user?.id
      ? db.orderItem.findFirst({
          where: {
            productId: product.id,
            order: {
              userId: session.user.id,
              status: "DELIVERED",
            },
          },
          select: { id: true },
        })
      : null,
    session?.user?.id
      ? db.review.findFirst({
          where: {
            productId: product.id,
            userId: session.user.id,
          },
          select: { id: true },
        })
      : null,
  ]);

  const relatedIds = relatedRaw.map((item) => item.id);
  const relatedReviews = relatedIds.length
    ? await db.review.groupBy({
        by: ["productId"],
        where: { productId: { in: relatedIds } },
        _avg: { rating: true },
        _count: { _all: true },
      })
    : [];
  const relatedReviewMap = new Map(
    relatedReviews.map((review) => [
      review.productId,
      {
        rating: review._avg.rating ?? 0,
        count: review._count._all,
      },
    ])
  );

  const reviews = product.reviews;
  const reviewCount = reviews.length;
  const rating =
    reviewCount > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : 0;
  const ratingBreakdown = [5, 4, 3, 2, 1].map((value) => ({
    rating: value,
    count: reviews.filter((review) => review.rating === value).length,
  }));

  const brand = getVariantValue(product.variants, "brand") ?? product.title.split(/\s+/)[0];
  const sku =
    getVariantValue(product.variants, "sku") ??
    `ECOM-${product.id.slice(-6).toUpperCase()}`;
  const colors = buildVariantOptions(product.variants, "color", {
    id: "default-color",
    label: "Default",
    stock: product.stock,
    swatch: "#0f172a",
  });
  const sizes = buildVariantOptions(product.variants, "size", {
    id: "default-size",
    label: "One Size",
    stock: product.stock,
  });
  const images =
    product.images.length > 0
      ? product.images.map((image) => ({
          id: image.id,
          url: image.url,
          alt: product.title,
        }))
      : [
          {
            id: "fallback-image",
            url: FALLBACK_PRODUCT_IMAGE,
            alt: product.title,
          },
        ];
  const relatedProducts = relatedRaw.map((item) =>
    mapProductCard(item, relatedReviewMap)
  );
  const frequentlyBoughtTogether = relatedProducts.slice(0, 2);

  const productDetail: ProductDetailData = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    category: {
      name: product.category.name,
      slug: product.category.slug,
    },
    brand,
    sku,
    price: product.price,
    discountPct: product.discountPct,
    stock: product.stock,
    images,
    colors,
    sizes,
    specifications: [
      { label: "Brand", value: brand },
      { label: "SKU", value: sku },
      { label: "Category", value: product.category.name },
      { label: "Base Price", value: `INR ${product.price.toFixed(2)}` },
      { label: "Discount", value: `${Math.round(product.discountPct)}%` },
      { label: "Availability", value: product.stock > 0 ? "In Stock" : "Out of Stock" },
      ...product.variants
        .filter(
          (variant) =>
            !["brand", "sku", "color", "size"].some((key) =>
              variant.name.toLowerCase().includes(key)
            )
        )
        .map((variant) => ({
          label: variant.name,
          value: variant.value,
        })),
    ],
    rating,
    reviewCount,
    ratingBreakdown,
    reviews: reviews.map((review) => ({
      id: review.id,
      userName: review.user.name ?? review.user.email ?? "Customer",
      avatarUrl: review.user.avatarUrl ?? review.user.image,
      rating: review.rating,
      date: formatReviewDate(review.createdAt),
      comment: review.comment ?? "No written comment provided.",
      isVerified: review.isVerified,
    })),
    frequentlyBoughtTogether,
    relatedProducts,
    canWriteReview: Boolean(session?.user?.id && deliveredOrderItem && !existingReview),
  };

  const salePrice =
    product.price * (1 - Math.max(0, Math.min(100, product.discountPct)) / 100);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description.replace(/<[^>]*>/g, ""),
    sku,
    brand: {
      "@type": "Brand",
      name: brand,
    },
    image: images.map((image) => image.url),
    aggregateRating:
      reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: rating.toFixed(1),
            reviewCount,
          }
        : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: salePrice.toFixed(2),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `/products/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductDetailView product={productDetail} />
    </>
  );
}
