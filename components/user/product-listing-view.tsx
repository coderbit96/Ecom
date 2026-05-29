"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Grid3X3,
  List,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

import { ProductCard, type ProductCardData } from "@/components/user/ProductCard";
import type { BrandOption, CategoryTreeNode } from "@/lib/product-listing";

type ProductListingViewProps = {
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

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "top-rated", label: "Top Rated" },
];

function splitList(value: string | null) {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasActiveDescendant(node: CategoryTreeNode, activeSlug: string | null): boolean {
  if (!activeSlug) return false;
  if (node.slug === activeSlug) return true;

  return node.children.some((child) => hasActiveDescendant(child, activeSlug));
}

function getExpandedCategorySlugs(
  categories: CategoryTreeNode[],
  activeSlug: string | null
) {
  const expanded = new Set<string>();

  const visit = (node: CategoryTreeNode) => {
    if (node.children.some((child) => hasActiveDescendant(child, activeSlug))) {
      expanded.add(node.slug);
    }

    node.children.forEach(visit);
  };

  categories.forEach(visit);
  return expanded;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductListingView({
  products,
  categories,
  brandOptions,
  activeCategorySlug,
  activeCategoryName,
  total,
  page,
  pageCount,
  priceBounds,
}: ProductListingViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") ?? activeCategorySlug;
  const selectedBrands = useMemo(
    () => splitList(searchParams.get("brand")),
    [searchParams]
  );
  const selectedRating = searchParams.get("rating");
  const sort = searchParams.get("sort") ?? "relevance";
  const view = searchParams.get("view") === "list" ? "list" : "grid";
  const inStockOnly = searchParams.get("inStock") === "1";
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => getExpandedCategorySlugs(categories, activeCategory)
  );
  const [priceDraft, setPriceDraft] = useState({
    min: searchParams.get("minPrice") ?? String(priceBounds.min),
    max: searchParams.get("maxPrice") ?? String(priceBounds.max),
  });

  useEffect(() => {
    setPriceDraft({
      min: searchParams.get("minPrice") ?? String(priceBounds.min),
      max: searchParams.get("maxPrice") ?? String(priceBounds.max),
    });
  }, [priceBounds.max, priceBounds.min, searchParams]);

  useEffect(() => {
    setExpandedCategories(getExpandedCategorySlugs(categories, activeCategory));
  }, [activeCategory, categories]);

  const updateParams = (
    updates: Record<string, string | undefined>,
    options: { resetPage?: boolean; scroll?: boolean } = {}
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
        return;
      }

      params.set(key, value);
    });

    if (options.resetPage ?? true) {
      params.delete("page");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, {
      scroll: options.scroll ?? false,
    });
  };

  const toggleListParam = (key: string, value: string) => {
    const current = splitList(searchParams.get(key));
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    updateParams({ [key]: next.length ? next.join(",") : undefined });
  };

  const commitPrice = () => {
    const min = Math.max(priceBounds.min, Number(priceDraft.min));
    const max = Math.min(priceBounds.max, Number(priceDraft.max));
    const safeMin = Number.isFinite(min) ? Math.min(min, max) : priceBounds.min;
    const safeMax = Number.isFinite(max) ? Math.max(max, safeMin) : priceBounds.max;

    updateParams({
      minPrice: safeMin > priceBounds.min ? String(safeMin) : undefined,
      maxPrice: safeMax < priceBounds.max ? String(safeMax) : undefined,
    });
  };

  const goToPage = (nextPage: number) => {
    updateParams(
      { page: nextPage > 1 ? String(nextPage) : undefined },
      { resetPage: false, scroll: true }
    );
  };

  const toggleCategory = (slug: string) => {
    setExpandedCategories((current) => {
      const next = new Set(current);

      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }

      return next;
    });
  };

  const renderCategoryNode = (node: CategoryTreeNode, depth = 0) => {
    const isExpanded = expandedCategories.has(node.slug);
    const isActive = activeCategory === node.slug;

    return (
      <div key={node.id}>
        <div
          className="grid grid-cols-[24px_1fr] items-center gap-1"
          style={{ paddingLeft: depth * 14 }}
        >
          {node.children.length ? (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse category" : "Expand category"}
              onClick={() => toggleCategory(node.slug)}
              className="flex size-6 items-center justify-center rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() =>
              updateParams({
                category: isActive ? undefined : node.slug,
              })
            }
            className={`truncate rounded-md px-2 py-1.5 text-left text-sm transition ${
              isActive
                ? "bg-[#fff7ed] font-semibold text-[#9a3412]"
                : "text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a]"
            }`}
          >
            {node.name}
          </button>
        </div>
        {isExpanded && node.children.length ? (
          <div className="mt-1 space-y-1">
            {node.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1)
    .filter(
      (pageNumber) =>
        pageNumber === 1 ||
        pageNumber === pageCount ||
        Math.abs(pageNumber - page) <= 1
    );

  let previousPageNumber = 0;

  const filterPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#f59e0b]" />
          <h2 className="text-sm font-semibold text-[#0f172a]">Filters</h2>
        </div>
        <button
          type="button"
          onClick={() =>
            updateParams({
              category: undefined,
              minPrice: undefined,
              maxPrice: undefined,
              rating: undefined,
              brand: undefined,
              inStock: undefined,
            })
          }
          className="text-xs font-medium text-[#64748b] hover:text-[#0f172a]"
        >
          Clear
        </button>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase text-[#64748b]">
          Category
        </h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => updateParams({ category: undefined })}
            className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition ${
              !activeCategory
                ? "bg-[#fff7ed] font-semibold text-[#9a3412]"
                : "text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a]"
            }`}
          >
            All products
          </button>
          {categories.map((category) => renderCategoryNode(category))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase text-[#64748b]">
          Price
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-[#475569]">
            <span>{formatCurrency(Number(priceDraft.min) || priceBounds.min)}</span>
            <span>{formatCurrency(Number(priceDraft.max) || priceBounds.max)}</span>
          </div>
          <div className="space-y-2">
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={priceDraft.min}
              onChange={(event) =>
                setPriceDraft((current) => ({
                  ...current,
                  min: event.target.value,
                }))
              }
              onMouseUp={commitPrice}
              onTouchEnd={commitPrice}
              onBlur={commitPrice}
              className="w-full accent-[#f59e0b]"
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={priceDraft.max}
              onChange={(event) =>
                setPriceDraft((current) => ({
                  ...current,
                  max: event.target.value,
                }))
              }
              onMouseUp={commitPrice}
              onTouchEnd={commitPrice}
              onBlur={commitPrice}
              className="w-full accent-[#f59e0b]"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase text-[#64748b]">
          Rating
        </h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <label
              key={rating}
              className="flex cursor-pointer items-center gap-2 text-sm text-[#334155]"
            >
              <input
                type="checkbox"
                checked={selectedRating === String(rating)}
                onChange={() =>
                  updateParams({
                    rating: selectedRating === String(rating) ? undefined : String(rating),
                  })
                }
                className="size-4 rounded border-[#cbd5e1] accent-[#f59e0b]"
              />
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className={`h-4 w-4 ${
                      index < rating
                        ? "fill-[#f59e0b] text-[#f59e0b]"
                        : "text-[#cbd5e1]"
                    }`}
                  />
                ))}
              </span>
              <span className="text-xs text-[#64748b]">& up</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase text-[#64748b]">
          Brand
        </h3>
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {brandOptions.length ? (
            brandOptions.map((brand) => (
              <label
                key={brand.value}
                className="flex cursor-pointer items-center justify-between gap-3 text-sm text-[#334155]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.value)}
                    onChange={() => toggleListParam("brand", brand.value)}
                    className="size-4 shrink-0 rounded border-[#cbd5e1] accent-[#f59e0b]"
                  />
                  <span className="truncate">{brand.label}</span>
                </span>
                <span className="text-xs text-[#94a3b8]">{brand.count}</span>
              </label>
            ))
          ) : (
            <p className="text-sm text-[#64748b]">No brands available</p>
          )}
        </div>
      </section>

      <section>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[#e2e8f0] px-3 py-2 text-sm font-medium text-[#334155]">
          <span>In-stock only</span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={() =>
              updateParams({
                inStock: inStockOnly ? undefined : "1",
              })
            }
            className="size-4 rounded border-[#cbd5e1] accent-[#f59e0b]"
          />
        </label>
      </section>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#e2e8f0] pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[#64748b]">
            {total} {total === 1 ? "result" : "results"} for{" "}
            <span className="font-semibold text-[#0f172a]">{activeCategoryName}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0f172a]">
            Product Listing
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd5e1] px-3 text-sm font-medium text-[#334155] lg:hidden"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <select
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value })}
            className="h-9 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm font-medium text-[#334155] outline-none focus:border-[#f59e0b]"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex rounded-md border border-[#cbd5e1] p-0.5">
            <button
              type="button"
              onClick={() => updateParams({ view: undefined }, { resetPage: false })}
              aria-label="Grid view"
              className={`flex size-8 items-center justify-center rounded ${
                view === "grid"
                  ? "bg-[#0f172a] text-white"
                  : "text-[#64748b] hover:bg-[#f8fafc]"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => updateParams({ view: "list" }, { resetPage: false })}
              aria-label="List view"
              className={`flex size-8 items-center justify-center rounded ${
                view === "list"
                  ? "bg-[#0f172a] text-white"
                  : "text-[#64748b] hover:bg-[#f8fafc]"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-72 shrink-0 rounded-lg border border-[#e2e8f0] bg-white p-4 lg:block">
          {filterPanel}
        </aside>

        <section className="min-w-0 flex-1">
          {products.length ? (
            <div
              className={
                view === "grid"
                  ? "grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid grid-cols-1 gap-4"
              }
            >
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant={view === "list" ? "list" : "grid"}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#cbd5e1] px-6 py-14 text-center">
              <h2 className="text-lg font-semibold text-[#0f172a]">No products found</h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Try clearing a few filters or broadening the price range.
              </p>
            </div>
          )}

          {pageCount > 1 ? (
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
              aria-label="Pagination"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                className="h-9 rounded-md border border-[#cbd5e1] px-3 text-sm font-medium text-[#334155] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              {pageNumbers.map((pageNumber) => {
                const showGap = pageNumber - previousPageNumber > 1;
                previousPageNumber = pageNumber;

                return (
                  <span key={pageNumber} className="flex items-center gap-2">
                    {showGap ? (
                      <span className="px-1 text-sm text-[#94a3b8]">...</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => goToPage(pageNumber)}
                      className={`flex size-9 items-center justify-center rounded-md border text-sm font-semibold ${
                        pageNumber === page
                          ? "border-[#0f172a] bg-[#0f172a] text-white"
                          : "border-[#cbd5e1] text-[#334155] hover:bg-[#f8fafc]"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => goToPage(page + 1)}
                className="h-9 rounded-md border border-[#cbd5e1] px-3 text-sm font-medium text-[#334155] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          ) : null}
        </section>
      </div>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-[#0f172a]/40"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-lg bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0f172a]">Filters</h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setIsFilterOpen(false)}
                className="flex size-8 items-center justify-center rounded-md text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      ) : null}
    </div>
  );
}
