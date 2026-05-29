export const CART_STORAGE_KEY = "ecom_cart_items";
export const SAVED_FOR_LATER_STORAGE_KEY = "ecom_saved_for_later";
export const CART_TAX_RATE = 0.18;

export type CartItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  variantId?: string | null;
  variant?: string | null;
  unitPrice: number;
  originalPrice?: number | null;
  quantity: number;
  stock?: number | null;
};

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  estimatedTax: number;
};

export function createCartItemId(productId: string, variantId?: string | null) {
  return `${productId}:${variantId || "default"}`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const parsed = readString(value);
  return parsed ? parsed : null;
}

function readFiniteNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((rawItem): CartItem | null => {
      if (!rawItem || typeof rawItem !== "object") return null;

      const item = rawItem as Record<string, unknown>;
      const productId = readString(item.productId);
      const name = readString(item.name);
      const slug = readString(item.slug);
      const imageUrl = readString(item.imageUrl);
      const unitPrice = readFiniteNumber(item.unitPrice);
      const quantity = Math.max(1, Math.floor(readFiniteNumber(item.quantity, 1)));
      const variantId = readOptionalString(item.variantId);
      const id = readString(item.id) || createCartItemId(productId, variantId);

      if (!productId || !name || !slug || !imageUrl || unitPrice < 0) {
        return null;
      }

      return {
        id,
        productId,
        slug,
        name,
        imageUrl,
        variantId,
        variant: readOptionalString(item.variant),
        unitPrice,
        originalPrice:
          item.originalPrice === null || item.originalPrice === undefined
            ? null
            : readFiniteNumber(item.originalPrice, unitPrice),
        quantity,
        stock:
          item.stock === null || item.stock === undefined
            ? null
            : Math.max(0, Math.floor(readFiniteNumber(item.stock))),
      };
    })
    .filter((item): item is CartItem => Boolean(item));
}

export function getCartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  return {
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    estimatedTax: subtotal * CART_TAX_RATE,
  };
}
