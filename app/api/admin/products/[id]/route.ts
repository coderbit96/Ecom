import { NextResponse } from "next/server";
import type { ProductStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";

type RouteProps = {
  params: { id: string };
};

function readNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type ImageInput = {
  url?: unknown;
  isPrimary?: unknown;
};

type VariantInput = {
  name?: unknown;
  value?: unknown;
  extraPrice?: unknown;
  stock?: unknown;
};

type ProductBody = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  sku?: unknown;
  brand?: unknown;
  price?: unknown;
  discountPct?: unknown;
  costPrice?: unknown;
  stock?: unknown;
  lowStockThreshold?: unknown;
  trackStock?: unknown;
  categoryId?: unknown;
  status?: unknown;
  images?: unknown;
  variants?: unknown;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { response } = await requireAdmin();
  if (response) return response;

  const product = await db.product.findUnique({
    where: { id: params.id },
    include: { category: true, images: true, variants: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as ProductBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid product body" }, { status: 400 });
  }

  if (Array.isArray(body.images)) {
    await db.productImage.deleteMany({ where: { productId: params.id } });
  }
  if (Array.isArray(body.variants)) {
    await db.productVariant.deleteMany({ where: { productId: params.id } });
  }

  const product = await db.product.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined ? { title: readString(body.title) } : {}),
      ...(body.slug !== undefined ? { slug: readString(body.slug) } : {}),
      ...(body.description !== undefined ? { description: readString(body.description) } : {}),
      ...(body.sku !== undefined ? { sku: readString(body.sku) || null } : {}),
      ...(body.brand !== undefined ? { brand: readString(body.brand) || null } : {}),
      ...(body.price !== undefined ? { price: readNumber(body.price) } : {}),
      ...(body.discountPct !== undefined ? { discountPct: readNumber(body.discountPct) } : {}),
      ...(body.costPrice !== undefined ? { costPrice: readNumber(body.costPrice) } : {}),
      ...(body.stock !== undefined ? { stock: readNumber(body.stock) } : {}),
      ...(body.lowStockThreshold !== undefined ? { lowStockThreshold: readNumber(body.lowStockThreshold, 10) } : {}),
      ...(body.trackStock !== undefined ? { trackStock: body.trackStock === true } : {}),
      ...(body.categoryId !== undefined ? { categoryId: readString(body.categoryId) } : {}),
      ...(body.status !== undefined ? { status: body.status as ProductStatus } : {}),
      ...(Array.isArray(body.images)
        ? {
            images: {
              create: (body.images as ImageInput[]).map((image, index) => ({
              url: readString(image.url),
              order: index,
              isPrimary: image.isPrimary === true,
            })).filter((image: { url: string }) => image.url)
            },
          }
        : {}),
      ...(Array.isArray(body.variants)
        ? {
            variants: {
              create: (body.variants as VariantInput[]).map((variant) => ({
              name: readString(variant.name),
              value: readString(variant.value),
              extraPrice: readNumber(variant.extraPrice),
              stock: readNumber(variant.stock),
            })).filter((variant: { name: string; value: string }) => variant.name && variant.value)
            },
          }
        : {}),
    },
    include: { images: true, variants: true },
  });

  return NextResponse.json({ product });
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const { response } = await requireAdmin();
  if (response) return response;

  await db.productImage.deleteMany({ where: { productId: params.id } });
  await db.productVariant.deleteMany({ where: { productId: params.id } });
  await db.wishlist.deleteMany({ where: { productId: params.id } });
  await db.product.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
