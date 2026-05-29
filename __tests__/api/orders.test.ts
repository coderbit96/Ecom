import { POST } from "@/app/api/orders/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    address: {
      findFirst: jest.fn(),
    },
    product: {
      updateMany: jest.fn(),
    },
    productVariant: {
      updateMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    userCart: {
      upsert: jest.fn(),
    },
  },
}));

const mockAuth = auth as jest.Mock;
const mockDb = db as unknown as {
  address: { findFirst: jest.Mock };
  product: { updateMany: jest.Mock };
  productVariant: { updateMany: jest.Mock };
  order: { create: jest.Mock; findUnique: jest.Mock };
  userCart: { upsert: jest.Mock };
};

function request(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockDb.address.findFirst.mockResolvedValue({ id: "507f1f77bcf86cd799439011" });
    mockDb.product.updateMany.mockResolvedValue({ count: 1 });
    mockDb.productVariant.updateMany.mockResolvedValue({ count: 1 });
    mockDb.order.create.mockResolvedValue({ id: "order-1" });
    mockDb.order.findUnique.mockResolvedValue({ id: "order-1", payments: [], items: [] });
    mockDb.userCart.upsert.mockResolvedValue({});
  });

  it("creates an order, decrements stock, clears cart, and returns order id", async () => {
    const response = await POST(
      request({
        addressId: "507f1f77bcf86cd799439011",
        paymentMethod: "card",
        items: [
          {
            productId: "507f1f77bcf86cd799439012",
            slug: "test-product",
            name: "Test Product",
            imageUrl: "https://example.com/image.jpg",
            unitPrice: 1200,
            quantity: 2,
          },
        ],
      })
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(mockDb.product.updateMany).toHaveBeenCalledWith({
      where: { id: "507f1f77bcf86cd799439012", stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(mockDb.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          addressId: "507f1f77bcf86cd799439011",
          total: 2400,
        }),
        select: { id: true },
      })
    );
    expect(mockDb.userCart.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", items: [] },
      update: { items: [] },
    });
    expect(json.order.id).toBe("order-1");
  });
});
