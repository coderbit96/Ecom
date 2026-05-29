import type { Metadata } from "next";

import { ProductListingView } from "@/components/user/product-listing-view";
import {
  getProductListingData,
  type ProductListingSearchParams,
} from "@/lib/product-listing";

type ProductsPageProps = {
  searchParams: ProductListingSearchParams;
};

export const metadata: Metadata = {
  title: "Products | Premium Commerce",
  description:
    "Browse premium products with category, price, rating, and availability filters.",
  openGraph: {
    title: "Products | Premium Commerce",
    description:
      "Browse premium products with category, price, rating, and availability filters.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Products | Premium Commerce",
    description:
      "Browse premium products with category, price, rating, and availability filters.",
  },
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const listing = await getProductListingData(searchParams);

  return <ProductListingView {...listing} />;
}
