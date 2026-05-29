import { POST } from "@/app/api/payments/verify/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { markPaymentSuccess } from "@/lib/payment-records";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    payment: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/payment-records", () => ({
  markPaymentSuccess: jest.fn(),
}));

jest.mock("@/lib/razorpay", () => ({
  verifyRazorpayPaymentSignature: jest.fn(),
}));

const mockAuth = auth as jest.Mock;
const findPayment = db.payment.findFirst as jest.Mock;
const mockVerify = verifyRazorpayPaymentSignature as jest.Mock;
const mockMarkPaymentSuccess = markPaymentSuccess as jest.Mock;

function request(body: unknown) {
  return new Request("http://localhost/api/payments/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("updates payment and order for a valid Razorpay signature", async () => {
    const payment = { id: "payment-1", orderId: "order-1" };
    findPayment.mockResolvedValue(payment);
    mockVerify.mockReturnValue(true);
    mockMarkPaymentSuccess.mockResolvedValue({ id: "order-1", status: "CONFIRMED" });

    const response = await POST(
      request({
        razorpay_payment_id: "pay_123",
        razorpay_order_id: "order_123",
        razorpay_signature: "signature",
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith({
      orderId: "order_123",
      paymentId: "pay_123",
      signature: "signature",
    });
    expect(mockMarkPaymentSuccess).toHaveBeenCalledWith({
      payment,
      razorpayPaymentId: "pay_123",
      razorpaySignature: "signature",
      metadata: { verifiedBy: "checkout" },
    });
    expect(json.order.status).toBe("CONFIRMED");
  });

  it("returns 400 for an invalid Razorpay signature", async () => {
    mockVerify.mockReturnValue(false);

    const response = await POST(
      request({
        razorpay_payment_id: "pay_123",
        razorpay_order_id: "order_123",
        razorpay_signature: "bad",
      })
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/signature/i);
    expect(findPayment).not.toHaveBeenCalled();
  });
});
