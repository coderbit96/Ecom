import type { MetadataRoute } from "next";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function siteUrl(path = "") {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    db.product
      .findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    db.category
      .findMany({
        select: { slug: true },
      })
      .catch(() => []),
  ]);

  return [
    {
      url: siteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: siteUrl("/products"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...categories.map((category) => ({
      url: siteUrl(`/category/${category.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: siteUrl(`/products/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
