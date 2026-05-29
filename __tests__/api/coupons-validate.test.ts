import { POST } from "@/app/api/coupons/validate/route";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    coupon: {
      findUnique: jest.fn(),
    },
  },
}));

const findUnique = db.coupon.findUnique as jest.Mock;

function request(body: unknown) {
  return new Request("http://localhost/api/coupons/validate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/coupons/validate", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("returns an error for expired coupons", async () => {
    findUnique.mockResolvedValue({
      code: "SAVE10",
      type: "PERCENTAGE",
      value: 10,
      minOrder: null,
      usageLimit: null,
      usedCount: 0,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      isActive: true,
    });

    const response = await POST(request({ code: "SAVE10", subtotal: 1000 }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.valid).toBe(false);
    expect(json.message).toMatch(/expired/i);
  });

  it("returns an error when usage limit is reached", async () => {
    findUnique.mockResolvedValue({
      code: "SAVE10",
      type: "PERCENTAGE",
      value: 10,
      minOrder: null,
      usageLimit: 1,
      usedCount: 1,
      expiresAt: null,
      isActive: true,
    });

    const response = await POST(request({ code: "SAVE10", subtotal: 1000 }));
    const json = await response.json();

    expect(json.valid).toBe(false);
    expect(json.message).toMatch(/usage limit/i);
  });

  it("returns discount for valid coupons", async () => {
    findUnique.mockResolvedValue({
      code: "SAVE10",
      type: "PERCENTAGE",
      value: 10,
      minOrder: null,
      usageLimit: null,
      usedCount: 0,
      expiresAt: null,
      isActive: true,
    });

    const response = await POST(request({ code: "save10", subtotal: 2000 }));
    const json = await response.json();

    expect(findUnique).toHaveBeenCalledWith({ where: { code: "SAVE10" } });
    expect(json).toMatchObject({ valid: true, code: "SAVE10", discount: 200 });
  });
});
