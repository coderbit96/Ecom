import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DealsOfTheDay } from "@/components/user/deals-of-the-day";
import { FeaturedCategories } from "@/components/user/featured-categories";
import { HeroBanner } from "@/components/user/hero-banner";
import { ProductRow } from "@/components/user/product-row";
import { RecentlyViewed } from "@/components/user/recently-viewed";
import type { ProductCardData } from "@/components/user/ProductCard";
import type { Metadata } from "next";
import { fallbackCategories, fallbackProducts } from "@/lib/storefront-fallback";

export const metadata: Metadata = {
  title: "Premium Commerce | Curated Online Shopping",
  description:
    "Shop premium products, daily deals, best sellers, and new arrivals across curated categories.",
  openGraph: {
    title: "Premium Commerce",
    description:
      "Shop premium products, daily deals, best sellers, and new arrivals across curated categories.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium Commerce",
    description:
      "Shop premium products, daily deals, best sellers, and new arrivals across curated categories.",
  },
};

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80";

const FALLBACK_CATEGORY_IMAGE =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80";

type ProductWithImage = {
  id: string;
  title: string;
  slug: string;
  price: number;
  discountPct: number;
  images: Array<{ url: string; isPrimary: boolean; order: number }>;
};

function endOfTodayIso() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

function mapProductCard(
  product: ProductWithImage,
  reviewMap: Map<string, { rating: number; count: number }>
): ProductCardData {
  const primaryImage =
    product.images.find((image) => image.isPrimary)?.url ??
    product.images[0]?.url ??
    FALLBACK_PRODUCT_IMAGE;

  const review = reviewMap.get(product.id);

  return {
    id: product.id,
    name: product.title,
    slug: product.slug,
    imageUrl: primaryImage,
    price: product.price,
    discountPct: product.discountPct,
    rating: review?.rating ?? 0,
    ratingCount: review?.count ?? 0,
  };
}

async function getBestSellers(): Promise<ProductWithImage[]> {
  const orderStats = await db.orderItem
    .groupBy({
      by: ["productId"],
      _count: { _all: true },
    })
    .catch(() => []);

  const bestIds = orderStats
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 8)
    .map((item) => item.productId);

  if (!bestIds.length) return [];

  const products = await db.product.findMany({
    where: {
      id: { in: bestIds },
      status: "PUBLISHED",
    },
    include: {
      images: {
        orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
      },
    },
  });

  const orderMap = new Map(bestIds.map((id, index) => [id, index]));

  return products.sort(
    (a, b) =>
      (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

export default async function UserHomePage() {
  const session = await auth().catch(() => null);

  const [categories, newArrivalsRaw, dealsRaw, bestSellersRaw] = await Promise.all([
    db.category
      .findMany({
        where: { parentId: null },
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
        },
        take: 12,
      })
      .catch(() => []),
    db.product
      .findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
          },
        },
        take: 8,
      })
      .catch(() => []),
    db.product
      .findMany({
        where: { status: "PUBLISHED", discountPct: { gt: 0 } },
        orderBy: [{ discountPct: "desc" }, { createdAt: "desc" }],
        include: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
          },
        },
        take: 8,
      })
      .catch(() => []),
    getBestSellers(),
  ]);

  const displayCategories = categories.length ? categories : fallbackCategories;
  const heroSlides = displayCategories.slice(0, 3).map((category, index) => ({
    id: category.id,
    title: `Discover ${category.name}`,
    subtitle:
      "Premium picks, thoughtful curation, and limited-time offers for your next favorite buy.",
    ctaLabel: "Shop Now",
    href: `/category/${category.slug}`,
    imageUrl:
      category.imageUrl ||
      [
        "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=80",
      ][index % 3],
  }));

  const allProducts = [...newArrivalsRaw, ...bestSellersRaw, ...dealsRaw];
  const allProductIds = Array.from(new Set(allProducts.map((product) => product.id)));

  const reviews = allProductIds.length
    ? await db.review
        .groupBy({
          by: ["productId"],
          where: { productId: { in: allProductIds } },
          _avg: { rating: true },
          _count: { _all: true },
        })
        .catch(() => [])
    : [];

  const reviewMap = new Map(
    reviews.map((review) => [
      review.productId,
      {
        rating: review._avg.rating ?? 0,
        count: review._count._all,
      },
    ])
  );

  const newArrivalsRawCards = newArrivalsRaw.map((product) =>
    mapProductCard(product, reviewMap)
  );
  const bestSellersRawCards = bestSellersRaw.map((product) =>
    mapProductCard(product, reviewMap)
  );
  const dealsRawCards = dealsRaw.map((product) => mapProductCard(product, reviewMap));
  const newArrivals = newArrivalsRawCards.length
    ? newArrivalsRawCards
    : fallbackProducts.slice(0, 6);
  const bestSellers = bestSellersRawCards.length
    ? bestSellersRawCards
    : fallbackProducts.slice(2, 8);
  const dealsOfTheDay = dealsRawCards.length ? dealsRawCards : fallbackProducts;

  const featuredCategories = displayCategories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl ?? FALLBACK_CATEGORY_IMAGE,
  }));

  return (
    <div className="space-y-10 py-2">
      <HeroBanner slides={heroSlides.length ? heroSlides : []} />

      <FeaturedCategories categories={featuredCategories} />

      <ProductRow title="New Arrivals" href="/products/new" products={newArrivals} />

      <ProductRow title="Best Sellers" href="/products/best-sellers" products={bestSellers} />

      <DealsOfTheDay products={dealsOfTheDay} endsAt={endOfTodayIso()} />

      <RecentlyViewed isLoggedIn={Boolean(session?.user)} />
    </div>
  );
}
