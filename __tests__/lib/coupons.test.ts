import type { Coupon } from "@prisma/client";

import { validateCoupon } from "@/lib/coupons";

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "coupon-id",
    code: "SAVE10",
    type: "PERCENTAGE",
    value: 10,
    minOrder: null,
    usageLimit: null,
    usedCount: 0,
    expiresAt: null,
    isActive: true,
    ...overrides,
  };
}

describe("coupon validator", () => {
  const now = new Date("2026-05-28T00:00:00.000Z");

  it("rejects expired coupons", () => {
    const result = validateCoupon(
      coupon({ expiresAt: new Date("2026-05-01T00:00:00.000Z") }),
      1000,
      now
    );

    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/expired/i);
  });

  it("rejects coupons that reached their usage limit", () => {
    const result = validateCoupon(coupon({ usageLimit: 5, usedCount: 5 }), 1000, now);

    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/usage limit/i);
  });

  it("returns a percentage discount for valid coupons", () => {
    const result = validateCoupon(coupon(), 2000, now);

    expect(result).toMatchObject({
      valid: true,
      code: "SAVE10",
      discount: 200,
    });
  });
});
