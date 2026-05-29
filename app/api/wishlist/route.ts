import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80";

function readProductId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ items: [], count: 0 }, { status: 401 });
  }

  const wishlistItems = await db.wishlist
    .findMany({
      where: { userId },
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

  const items = wishlistItems
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
    });

  return NextResponse.json({
    items,
    count: items.length,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    productId?: unknown;
  } | null;
  const productId = readProductId(body?.productId);

  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  }

  const product = await db.product.findFirst({
    where: { id: productId, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const item = await db.wishlist.upsert({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    create: {
      userId,
      productId,
    },
    update: {},
  });

  const count = await db.wishlist.count({ where: { userId } });

  return NextResponse.json({ item, count }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const body = (await request.json().catch(() => null)) as {
    productId?: unknown;
  } | null;
  const productId =
    readProductId(searchParams.get("productId")) || readProductId(body?.productId);

  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  }

  await db.wishlist
    .delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    })
    .catch(() => null);

  const count = await db.wishlist.count({ where: { userId } }).catch(() => 0);

  return NextResponse.json({ ok: true, count });
}
