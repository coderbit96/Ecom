import { NextResponse } from "next/server";

import { db } from "@/lib/db";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ids");

  if (!raw) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  }

  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!ids.length) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  }

  const products = await db.product.findMany({
    where: {
      id: { in: ids },
      status: "PUBLISHED",
    },
    include: {
      images: {
        orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
        take: 1,
      },
    },
  });

  const reviews = await db.review.groupBy({
    by: ["productId"],
    where: {
      productId: { in: products.map((product) => product.id) },
    },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const reviewMap = new Map(
    reviews.map((item) => [
      item.productId,
      {
        rating: item._avg.rating ?? 0,
        count: item._count._all,
      },
    ])
  );

  const orderMap = new Map(ids.map((id, index) => [id, index]));

  const formatted = products
    .map((product) => {
      const ratingData = reviewMap.get(product.id);
      const primaryImage = product.images[0]?.url ?? FALLBACK_PRODUCT_IMAGE;

      return {
        id: product.id,
        name: product.title,
        slug: product.slug,
        imageUrl: primaryImage,
        price: product.price,
        discountPct: product.discountPct,
        rating: ratingData?.rating ?? 0,
        ratingCount: ratingData?.count ?? 0,
      };
    })
    .sort(
      (a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );

  return NextResponse.json(formatted, {
    headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=240" },
  });
}
