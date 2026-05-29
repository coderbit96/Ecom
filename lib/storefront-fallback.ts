import type { ProductDetailData } from "@/components/user/product-detail-view";
import type { ProductCardData } from "@/components/user/ProductCard";
import type { CategoryTreeNode, ProductListingData } from "@/lib/product-listing";

export const fallbackCategories = [
  {
    id: "demo-fashion",
    name: "Fashion",
    slug: "fashion",
    imageUrl:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "demo-home",
    name: "Home Living",
    slug: "home-living",
    imageUrl:
      "https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "demo-tech",
    name: "Tech Essentials",
    slug: "tech-essentials",
    imageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "demo-beauty",
    name: "Beauty",
    slug: "beauty",
    imageUrl:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "demo-travel",
    name: "Travel Gear",
    slug: "travel-gear",
    imageUrl:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "demo-fitness",
    name: "Fitness",
    slug: "fitness",
    imageUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  },
];

export const fallbackHeroSlides = [
  {
    id: "hero-1",
    title: "Fresh Finds for Everyday Style",
    subtitle:
      "Shop curated fashion, home, tech, and lifestyle essentials with a premium storefront experience.",
    ctaLabel: "Shop Collection",
    href: "/products",
    imageUrl:
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=85",
  },
  {
    id: "hero-2",
    title: "Upgrade Your Home and Routine",
    subtitle:
      "Discover refined picks for work, comfort, gifting, travel, and weekend plans.",
    ctaLabel: "Explore Deals",
    href: "/products?sort=newest",
    imageUrl:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=85",
  },
];

export const fallbackProducts: ProductCardData[] = [
  {
    id: "demo-product-1",
    name: "Linen Blend Overshirt",
    slug: "linen-blend-overshirt",
    imageUrl:
      "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80",
    price: 2499,
    discountPct: 18,
    rating: 4.6,
    ratingCount: 128,
  },
  {
    id: "demo-product-2",
    name: "Minimal Desk Lamp",
    slug: "minimal-desk-lamp",
    imageUrl:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
    price: 3299,
    discountPct: 12,
    rating: 4.5,
    ratingCount: 87,
  },
  {
    id: "demo-product-3",
    name: "Everyday Wireless Headphones",
    slug: "everyday-wireless-headphones",
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    price: 5999,
    discountPct: 22,
    rating: 4.7,
    ratingCount: 214,
  },
  {
    id: "demo-product-4",
    name: "Ceramic Dinner Set",
    slug: "ceramic-dinner-set",
    imageUrl:
      "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=900&q=80",
    price: 4499,
    discountPct: 15,
    rating: 4.4,
    ratingCount: 73,
  },
  {
    id: "demo-product-5",
    name: "Signature Travel Backpack",
    slug: "signature-travel-backpack",
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    price: 3799,
    discountPct: 10,
    rating: 4.8,
    ratingCount: 156,
  },
  {
    id: "demo-product-6",
    name: "Hydrating Skincare Kit",
    slug: "hydrating-skincare-kit",
    imageUrl:
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=900&q=80",
    price: 1899,
    discountPct: 20,
    rating: 4.3,
    ratingCount: 91,
  },
  {
    id: "demo-product-7",
    name: "Performance Training Shoes",
    slug: "performance-training-shoes",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    price: 6999,
    discountPct: 25,
    rating: 4.6,
    ratingCount: 184,
  },
  {
    id: "demo-product-8",
    name: "Textured Cotton Throw",
    slug: "textured-cotton-throw",
    imageUrl:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80",
    price: 2199,
    discountPct: 14,
    rating: 4.5,
    ratingCount: 64,
  },
];

export const fallbackCategoryTree: CategoryTreeNode[] = fallbackCategories.map(
  (category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: null,
    children: [],
  })
);

export function getFallbackProductListingData(
  page = 1,
  activeCategorySlug: string | null = null
): ProductListingData {
  return {
    products: fallbackProducts,
    categories: fallbackCategoryTree,
    brandOptions: [
      { value: "ecom", label: "Ecom", count: fallbackProducts.length },
      { value: "studio", label: "Studio", count: 3 },
      { value: "daily", label: "Daily", count: 5 },
    ],
    activeCategorySlug,
    activeCategoryName:
      fallbackCategories.find((category) => category.slug === activeCategorySlug)?.name ??
      "All products",
    total: fallbackProducts.length,
    page,
    pageCount: 1,
    priceBounds: {
      min: 1899,
      max: 6999,
    },
  };
}

export function getFallbackProductDetail(slug: string): ProductDetailData | null {
  const product = fallbackProducts.find((item) => item.slug === slug);
  if (!product) return null;

  const relatedProducts = fallbackProducts.filter((item) => item.slug !== slug).slice(0, 6);

  return {
    id: product.id,
    title: product.name,
    slug: product.slug,
    description:
      "A demo storefront product with polished visuals, variant selection, delivery estimate, cart actions, recommendations, and review content. Connect MongoDB to replace this catalog with your live products.",
    category: {
      name: fallbackCategories[0].name,
      slug: fallbackCategories[0].slug,
    },
    brand: "Ecom Studio",
    sku: `DEMO-${product.id.toUpperCase()}`,
    price: product.price,
    discountPct: product.discountPct,
    stock: 24,
    images: [
      { id: `${product.id}-image-1`, url: product.imageUrl, alt: product.name },
      {
        id: `${product.id}-image-2`,
        url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80",
        alt: `${product.name} lifestyle view`,
      },
    ],
    colors: [
      {
        id: `${product.id}-black`,
        label: "Black",
        value: "Black",
        stock: 12,
        extraPrice: 0,
        swatch: "#111827",
      },
      {
        id: `${product.id}-sand`,
        label: "Sand",
        value: "Sand",
        stock: 12,
        extraPrice: 0,
        swatch: "#d6b98c",
      },
    ],
    sizes: ["S", "M", "L", "XL"].map((size) => ({
      id: `${product.id}-${size}`,
      label: size,
      value: size,
      stock: 8,
      extraPrice: 0,
    })),
    specifications: [
      { label: "Brand", value: "Ecom Studio" },
      { label: "Material", value: "Premium mixed materials" },
      { label: "Warranty", value: "12 months" },
      { label: "Availability", value: "In Stock" },
    ],
    rating: product.rating,
    reviewCount: product.ratingCount,
    ratingBreakdown: [
      { rating: 5, count: 72 },
      { rating: 4, count: 38 },
      { rating: 3, count: 12 },
      { rating: 2, count: 4 },
      { rating: 1, count: 2 },
    ],
    reviews: [
      {
        id: `${product.id}-review-1`,
        userName: "Aarav Mehta",
        avatarUrl: null,
        rating: 5,
        date: "28 May 2026",
        comment: "Looks premium, arrived quickly, and feels exactly like the photos.",
        isVerified: true,
      },
      {
        id: `${product.id}-review-2`,
        userName: "Nisha Rao",
        avatarUrl: null,
        rating: 4,
        date: "22 May 2026",
        comment: "Great quality for the price. The checkout and cart flow work smoothly.",
        isVerified: true,
      },
    ],
    frequentlyBoughtTogether: relatedProducts.slice(0, 2),
    relatedProducts,
    canWriteReview: false,
  };
}
