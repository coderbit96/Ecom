"use client";

import { useEffect, useMemo, useState } from "react";

import { ProductCard, type ProductCardData } from "@/components/user/ProductCard";

type DealsOfTheDayProps = {
  products: ProductCardData[];
  endsAt: string;
};

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function DealsOfTheDay({ products, endsAt }: DealsOfTheDayProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = useMemo(() => {
    if (now === null) return "--:--:--";
    const end = new Date(endsAt).getTime();
    return formatTime(end - now);
  }, [endsAt, now]);

  if (!products.length) return null;

  return (
    <section className="space-y-4 rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-[#9a3412]">
          Deals of the Day
        </h2>
        <span className="rounded bg-[#9a3412] px-3 py-1 text-xs font-semibold text-white">
          Ends in {remaining}
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
