"use client";

import { useEffect, useState } from "react";

import { ProductCard, type ProductCardData } from "@/components/user/ProductCard";

const RECENTLY_VIEWED_STORAGE_KEY = "ecom_recently_viewed";

type RecentlyViewedProps = {
  isLoggedIn: boolean;
};

export function RecentlyViewed({ isLoggedIn }: RecentlyViewedProps) {
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const savedIdsRaw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    const ids = savedIdsRaw ? (JSON.parse(savedIdsRaw) as string[]) : [];

    if (!ids.length) return;

    const params = new URLSearchParams();
    params.set("ids", ids.join(","));

    const fetchData = async () => {
      const response = await fetch(`/api/products/recently-viewed?${params}`);
      if (!response.ok) return;

      const data = (await response.json()) as ProductCardData[];
      setProducts(data);
    };

    void fetchData();
  }, [isLoggedIn]);

  if (!isLoggedIn || !products.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-[#0f172a]">
        Recently Viewed
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
