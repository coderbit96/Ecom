import type { Prisma } from "@prisma/client";

import type { ProductCardData } from "@/components/user/ProductCard";
import { db } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";

export const PRODUCTS_PER_PAGE = 20;

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80";

const SORT_VALUES = new Set([
  "relevance",
  "price-asc",
  "price-desc",
  "newest",
  "top-rated",
]);

export type ProductListingSearchParams = {
  category?: string | string[];
  minPrice?: string | string[];
  maxPrice?: string | string[];
  rating?: string | string[];
  brand?: string | string[];
  sort?: string | string[];
  page?: string | string[];
  inStock?: string | string[];
  view?: string | string[];
};

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryTreeNode[];
};

export type BrandOption = {
  value: string;
  label: string;
  count: number;
};

export type ProductListingData = {
  products: ProductCardData[];
  categories: CategoryTreeNode[];
  brandOptions: BrandOption[];
  activeCategorySlug: string | null;
  activeCategoryName: string;
  total: number;
  page: number;
  pageCount: number;
  priceBounds: {
    min: number;
    max: number;
  };
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
};

type ProductRecord = {
  id: string;
  title: string;
  slug: string;
  price: number;
  discountPct: number;
  stock: number;
  createdAt: Date;
  images: Array<{ url: string; isPrimary: boolean; order: number }>;
  variants: Array<{ name: string; value: string }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseNumber(value: string | string[] | undefined) {
  const parsed = Number(firstValue(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePage(value: string | string[] | undefined) {
  const parsed = Math.floor(Number(firstValue(value)));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseBrands(value: string | string[] | undefined) {
  const raw = firstValue(value);
  if (!raw) return [];

  return raw
    .split(",")
    .map((brand) => brand.trim())
    .map(normalizeBrand)
    .filter(Boolean);
}

function normalizeSort(value: string | string[] | undefined) {
  const sort = firstValue(value) ?? "relevance";
  return SORT_VALUES.has(sort) ? sort : "relevance";
}

function normalizeBrand(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function getProductBrand(product: ProductRecord) {
  const brandVariant = product.variants.find((variant) =>
    variant.name.toLowerCase().includes("brand")
  );

  const label = brandVariant?.value || product.title.split(/\s+/)[0] || "Other";

  return {
    label,
    value: normalizeBrand(label),
  };
}

function getDiscountedPrice(product: ProductRecord) {
  return product.discountPct > 0
    ? product.price * (1 - product.discountPct / 100)
    : product.price;
}

function buildCategoryTree(categories: CategoryRecord[]) {
  const nodeMap = new Map<string, CategoryTreeNode>();

  categories.forEach((category) => {
    nodeMap.set(category.id, {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      children: [],
    });
  });

  const roots: CategoryTreeNode[] = [];

  categories.forEach((category) => {
    const node = nodeMap.get(category.id);
    if (!node) return;

    if (category.parentId && nodeMap.has(category.parentId)) {
      nodeMap.get(category.parentId)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

function collectDescendantIds(category: CategoryRecord, categories: CategoryRecord[]) {
  const ids = new Set([category.id]);
  const childrenByParent = new Map<string, CategoryRecord[]>();

  categories.forEach((item) => {
    if (!item.parentId) return;

    const children = childrenByParent.get(item.parentId) ?? [];
    children.push(item);
    childrenByParent.set(item.parentId, children);
  });

  const visit = (parentId: string) => {
    for (const child of childrenByParent.get(parentId) ?? []) {
      ids.add(child.id);
      visit(child.id);
    }
  };

  visit(category.id);

  return Array.from(ids);
}

function mapProductCard(
  product: ProductRecord,
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

function emptyProductListingData(
  page: number,
  activeCategorySlug: string | null = null,
  activeCategoryName = "Products unavailable"
): ProductListingData {
  return {
    products: [],
    categories: [],
    brandOptions: [],
    activeCategorySlug,
    activeCategoryName,
    total: 0,
    page,
    pageCount: 1,
    priceBounds: {
      min: 0,
      max: 10000,
    },
  };
}

export async function getProductListingData(
  searchParams: ProductListingSearchParams,
  routeCategorySlug?: string
): Promise<ProductListingData> {
  const cacheKey = `product-listing:${routeCategorySlug ?? "all"}:${JSON.stringify(
    Object.keys(searchParams)
      .sort()
      .reduce<Record<string, string | string[] | undefined>>((result, key) => {
        result[key] = searchParams[key as keyof ProductListingSearchParams];
        return result;
      }, {})
  )}`;
  const cached = await cacheGet<ProductListingData>(cacheKey);
  if (cached) return cached;

  const categorySlug =
    firstValue(searchParams.category) || routeCategorySlug || undefined;
  const minPrice = parseNumber(searchParams.minPrice);
  const maxPrice = parseNumber(searchParams.maxPrice);
  const minRating = parseNumber(searchParams.rating);
  const page = parsePage(searchParams.page);
  const selectedBrands = new Set(parseBrands(searchParams.brand));
  const sort = normalizeSort(searchParams.sort);
  const inStockOnly = firstValue(searchParams.inStock) === "1";

  try {
    const categories = await db.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        order: true,
      },
    });

    const selectedCategory = categorySlug
      ? categories.find((category) => category.slug === categorySlug)
      : undefined;
    const categoryIds = selectedCategory
      ? collectDescendantIds(selectedCategory, categories)
      : undefined;

    const baseWhere: Prisma.ProductWhereInput = {
      status: "PUBLISHED",
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(inStockOnly ? { stock: { gt: 0 } } : {}),
    };

    const priceWhere: Prisma.ProductWhereInput =
      minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {};

    const [facetProducts, matchingProducts] = await Promise.all([
      db.product.findMany({
        where: baseWhere,
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          discountPct: true,
          stock: true,
          createdAt: true,
          variants: {
            select: {
              name: true,
              value: true,
            },
          },
          images: {
            orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
            select: {
              url: true,
              isPrimary: true,
              order: true,
            },
          },
        },
      }),
      db.product.findMany({
        where: { ...baseWhere, ...priceWhere },
        include: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
          },
          variants: true,
        },
      }),
    ]);

    const allIds = matchingProducts.map((product) => product.id);
    const reviews = allIds.length
      ? await db.review.groupBy({
          by: ["productId"],
          where: { productId: { in: allIds } },
          _avg: { rating: true },
          _count: { _all: true },
        })
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

    const brandCounts = new Map<string, BrandOption>();
    facetProducts.forEach((product) => {
      const brand = getProductBrand(product);
      const current = brandCounts.get(brand.value);

      brandCounts.set(brand.value, {
        value: brand.value,
        label: current?.label ?? brand.label,
        count: (current?.count ?? 0) + 1,
      });
    });

    const enrichedProducts = matchingProducts
      .map((product) => {
        const brand = getProductBrand(product);
        const review = reviewMap.get(product.id);

        return {
          product,
          brand,
          rating: review?.rating ?? 0,
        };
      })
      .filter((item) =>
        selectedBrands.size ? selectedBrands.has(item.brand.value) : true
      )
      .filter((item) =>
        minRating !== undefined ? item.rating >= minRating : true
      );

    enrichedProducts.sort((a, b) => {
      if (sort === "price-asc") {
        return getDiscountedPrice(a.product) - getDiscountedPrice(b.product);
      }

      if (sort === "price-desc") {
        return getDiscountedPrice(b.product) - getDiscountedPrice(a.product);
      }

      if (sort === "top-rated") {
        return (
          b.rating - a.rating ||
          b.product.createdAt.getTime() - a.product.createdAt.getTime()
        );
      }

      return b.product.createdAt.getTime() - a.product.createdAt.getTime();
    });

    const total = enrichedProducts.length;
    const pageCount = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
    const safePage = Math.min(page, pageCount);
    const products = enrichedProducts
      .slice((safePage - 1) * PRODUCTS_PER_PAGE, safePage * PRODUCTS_PER_PAGE)
      .map((item) => mapProductCard(item.product, reviewMap));

    const prices = facetProducts.map((product) => product.price);
    const priceMin = prices.length ? Math.floor(Math.min(...prices)) : 0;
    const priceMax = prices.length ? Math.ceil(Math.max(...prices)) : 10000;

    const result = {
      products,
      categories: buildCategoryTree(categories),
      brandOptions: Array.from(brandCounts.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
      activeCategorySlug: selectedCategory?.slug ?? null,
      activeCategoryName: selectedCategory?.name ?? "All products",
      total,
      page: safePage,
      pageCount,
      priceBounds: {
        min: priceMin,
        max: Math.max(priceMin, priceMax),
      },
    };

    await cacheSet(cacheKey, result, 120);

    return result;
  } catch (error) {
    console.error("Unable to load product listing data", error);
    return emptyProductListingData(page, categorySlug ?? null);
  }
}
