import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRazorpayConfig, signRazorpayPayload } from "@/lib/razorpay";

/**
 * Verifies `razorpay_signature` for Standard Checkout (HMAC of `order_id|payment_id`).
 * Order completion + stock updates use `/api/payments/razorpay/verify` with `publicOrderRef`.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { keySecret, enabled } = getRazorpayConfig();
    if (!enabled || !keySecret) {
      return NextResponse.json({ error: "Razorpay is not configured on server." }, { status: 500 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const orderId = String(body.razorpay_order_id ?? body.order_id ?? "").trim();
    const paymentId = String(body.razorpay_payment_id ?? body.payment_id ?? "").trim();
    const signature = String(body.razorpay_signature ?? body.signature ?? "").trim();

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: "Missing razorpay_order_id, razorpay_payment_id, or razorpay_signature." },
        { status: 400 }
      );
    }

    const expected = signRazorpayPayload(orderId, paymentId, keySecret);
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }
}
