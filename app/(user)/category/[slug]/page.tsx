import type { Metadata } from "next";

import { ProductListingView } from "@/components/user/product-listing-view";
import {
  getProductListingData,
  type ProductListingSearchParams,
} from "@/lib/product-listing";

type CategoryProductsPageProps = {
  params: {
    slug: string;
  };
  searchParams: ProductListingSearchParams;
};

export async function generateMetadata({
  params,
}: CategoryProductsPageProps): Promise<Metadata> {
  const title = `${params.slug.replaceAll("-", " ")} | Premium Commerce`;

  return {
    title,
    description: `Shop ${params.slug.replaceAll("-", " ")} products on Premium Commerce.`,
    openGraph: {
      title,
      description: `Shop ${params.slug.replaceAll("-", " ")} products on Premium Commerce.`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: `Shop ${params.slug.replaceAll("-", " ")} products on Premium Commerce.`,
    },
  };
}

export default async function CategoryProductsPage({
  params,
  searchParams,
}: CategoryProductsPageProps) {
  const listing = await getProductListingData(searchParams, params.slug);

  return <ProductListingView {...listing} />;
}
