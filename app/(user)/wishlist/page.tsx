import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WishlistView } from "@/components/user/wishlist-view";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Wishlist | Premium Commerce",
};

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80";

export default async function WishlistPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const wishlistItems = await db.wishlist
    .findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            images: {
              orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
              take: 1,
            },
          },
        },
      },
    })
    .catch(() => []);

  const productIds = wishlistItems.map((item) => item.productId);
  const reviews = productIds.length
    ? await db.review
        .groupBy({
          by: ["productId"],
          where: { productId: { in: productIds } },
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

  return (
    <WishlistView
      initialItems={wishlistItems
        .filter((item) => item.product.status === "PUBLISHED")
        .map((item) => {
          const review = reviewMap.get(item.productId);

          return {
            wishlistId: item.id,
            product: {
              id: item.product.id,
              name: item.product.title,
              slug: item.product.slug,
              imageUrl: item.product.images[0]?.url ?? FALLBACK_PRODUCT_IMAGE,
              price: item.product.price,
              discountPct: item.product.discountPct,
              rating: review?.rating ?? 0,
              ratingCount: review?.count ?? 0,
            },
          };
        })}
    />
  );
}
