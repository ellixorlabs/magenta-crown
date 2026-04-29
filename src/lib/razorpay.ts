import crypto from "crypto";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
  return { keyId, keySecret, enabled: Boolean(keyId && keySecret) };
}

export function signRazorpayPayload(orderId: string, paymentId: string, keySecret: string) {
  return crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
}

