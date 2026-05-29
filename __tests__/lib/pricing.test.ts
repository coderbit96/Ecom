import { calculateOrderPricing, getShippingFee } from "@/lib/pricing";

describe("pricing utilities", () => {
  it("calculates subtotal, discount, tax, shipping, and total", () => {
    const result = calculateOrderPricing({
      items: [
        { unitPrice: 1000, quantity: 2 },
        { unitPrice: 500, quantity: 1 },
      ],
      discount: 250,
      taxRate: 0.18,
    });

    expect(result).toEqual({
      subtotal: 2500,
      discount: 250,
      tax: 405,
      shipping: 99,
      total: 2754,
    });
  });

  it("does not charge shipping on empty or high-value carts", () => {
    expect(getShippingFee(0)).toBe(0);
    expect(getShippingFee(5000)).toBe(0);
  });
});
