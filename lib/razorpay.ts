import crypto from "crypto";
import Razorpay from "razorpay";

const RAZORPAY_PLACEHOLDER_PREFIX = "replace-with-";

export function getRazorpayKeyId() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  return keyId && !keyId.startsWith(RAZORPAY_PLACEHOLDER_PREFIX) ? keyId : "";
}

export function getRazorpaySecret() {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  return secret && !secret.startsWith(RAZORPAY_PLACEHOLDER_PREFIX) ? secret : "";
}

export function getRazorpayWebhookSecret() {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";
  return secret && !secret.startsWith(RAZORPAY_PLACEHOLDER_PREFIX) ? secret : "";
}

export function getRazorpayClient() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpaySecret();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export function toPaise(amount: number) {
  return Math.max(0, Math.round(amount * 100));
}

export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = getRazorpaySecret();
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

export function verifyRazorpayWebhookSignature(payload: string, signature: string) {
  const secret = getRazorpayWebhookSecret();
  if (!secret || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (expectedSignature.length !== signature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}
