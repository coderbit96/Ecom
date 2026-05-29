import Link from "next/link";

import { ProductCard, type ProductCardData } from "@/components/user/ProductCard";

type ProductRowProps = {
  title: string;
  href: string;
  products: ProductCardData[];
};

export function ProductRow({ title, href, products }: ProductRowProps) {
  if (!products.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-[#0f172a]">
          {title}
        </h2>
        <Link href={href} className="text-sm font-medium text-[#f59e0b]">
          View all
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
