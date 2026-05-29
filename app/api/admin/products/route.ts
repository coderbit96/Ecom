import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { buildProductWhere, PAGE_SIZE } from "@/lib/admin/data";
import { db } from "@/lib/db";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

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

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const where = buildProductWhere(params);

  if (url.searchParams.get("export") === "csv") {
    const products = await db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { category: true },
    });
    const rows = [
      ["Title", "SKU", "Brand", "Category", "Price", "Stock", "Status", "Updated"],
      ...products.map((product) => [
        product.title,
        product.sku ?? "",
        product.brand ?? "",
        product.category.name,
        product.price.toFixed(2),
        product.stock,
        product.status,
        product.updatedAt.toISOString(),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="products.csv"',
      },
    });
  }

  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: true, images: true, variants: true },
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, pageSize: PAGE_SIZE });
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = (await request.json().catch(() => null)) as ProductBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid product body" }, { status: 400 });
  }

  const product = await db.product.create({
    data: {
      title: readString(body.title),
      slug: readString(body.slug),
      description: readString(body.description),
      sku: readString(body.sku) || null,
      brand: readString(body.brand) || null,
      price: readNumber(body.price),
      discountPct: readNumber(body.discountPct),
      costPrice: body.costPrice === "" ? null : readNumber(body.costPrice),
      stock: readNumber(body.stock),
      lowStockThreshold: readNumber(body.lowStockThreshold, 10),
      trackStock: body.trackStock !== false,
      categoryId: readString(body.categoryId),
      status: body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      images: {
        create: Array.isArray(body.images)
          ? (body.images as ImageInput[]).map((image, index) => ({
              url: readString(image.url),
              order: index,
              isPrimary: image.isPrimary === true,
            })).filter((image: { url: string }) => image.url)
          : [],
      },
      variants: {
        create: Array.isArray(body.variants)
          ? (body.variants as VariantInput[]).map((variant) => ({
              name: readString(variant.name),
              value: readString(variant.value),
              extraPrice: readNumber(variant.extraPrice),
              stock: readNumber(variant.stock),
            })).filter((variant: { name: string; value: string }) => variant.name && variant.value)
          : [],
      },
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
