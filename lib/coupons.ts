import type { Coupon } from "@prisma/client";

export type CouponValidationResult = {
  valid: boolean;
  discount: number;
  message: string;
  code?: string;
};

export function validateCoupon(
  coupon: Coupon | null,
  subtotal: number,
  now = new Date()
): CouponValidationResult {
  if (!coupon || !coupon.isActive) {
    return {
      valid: false,
      discount: 0,
      message: "Coupon code was not found.",
    };
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    return {
      valid: false,
      discount: 0,
      message: "This coupon has expired.",
    };
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return {
      valid: false,
      discount: 0,
      message: "This coupon has reached its usage limit.",
    };
  }

  if (coupon.minOrder !== null && subtotal < coupon.minOrder) {
    return {
      valid: false,
      discount: 0,
      message: `Add INR ${(coupon.minOrder - subtotal).toFixed(2)} more to use this coupon.`,
    };
  }

  const rawDiscount =
    coupon.type === "PERCENTAGE" ? subtotal * (coupon.value / 100) : coupon.value;
  const discount = Math.min(subtotal, Math.max(0, rawDiscount));

  return {
    valid: true,
    code: coupon.code,
    discount,
    message: `Coupon applied. You saved INR ${discount.toFixed(2)}.`,
  };
}
