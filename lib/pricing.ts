export const DEFAULT_TAX_RATE = 0.18;
export const FREE_SHIPPING_THRESHOLD = 5000;
export const STANDARD_SHIPPING_FEE = 99;

export type PriceCalculationInput = {
  items: Array<{
    unitPrice: number;
    quantity: number;
  }>;
  discount?: number;
  taxRate?: number;
  freeShippingThreshold?: number;
  shippingFee?: number;
};

export function getShippingFee(
  subtotal: number,
  threshold = FREE_SHIPPING_THRESHOLD,
  fee = STANDARD_SHIPPING_FEE
) {
  if (subtotal <= 0) return 0;
  return subtotal >= threshold ? 0 : fee;
}

export function calculateOrderPricing({
  items,
  discount = 0,
  taxRate = DEFAULT_TAX_RATE,
  freeShippingThreshold = FREE_SHIPPING_THRESHOLD,
  shippingFee = STANDARD_SHIPPING_FEE,
}: PriceCalculationInput) {
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, item.unitPrice) * Math.max(0, item.quantity),
    0
  );
  const appliedDiscount = Math.min(subtotal, Math.max(0, discount));
  const taxableAmount = Math.max(0, subtotal - appliedDiscount);
  const tax = taxableAmount * taxRate;
  const shipping = getShippingFee(subtotal, freeShippingThreshold, shippingFee);

  return {
    subtotal,
    discount: appliedDiscount,
    tax,
    shipping,
    total: Math.max(0, taxableAmount + tax + shipping),
  };
}
