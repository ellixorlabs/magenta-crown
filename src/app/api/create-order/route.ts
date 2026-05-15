import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createRazorpayOrderRest, getRazorpayConfig } from "@/lib/razorpay";

/**
 * Generic Razorpay Standard Checkout: create order from client-supplied amount (paise).
 * Production checkout uses `/api/payments/razorpay/create-order` with `publicOrderRef`.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { keyId } = getRazorpayConfig();
    const body = (await req.json()) as { amount?: unknown; currency?: unknown; receipt?: unknown };
    const amountRaw = body.amount;
    const amount = typeof amountRaw === "number" && Number.isFinite(amountRaw) ? Math.trunc(amountRaw) : NaN;
    const currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().toUpperCase()
        : "INR";
    const receipt =
      typeof body.receipt === "string" && body.receipt.trim()
        ? body.receipt.trim().slice(0, 40)
        : `rcpt_${Date.now()}`;

    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json({ error: "amount is required and must be at least 100 (paise)." }, { status: 400 });
    }

    const result = await createRazorpayOrderRest({
      amountPaise: amount,
      currency,
      receipt,
      notes: { userId: session.user.id }
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      order_id: result.id,
      amount: result.amount,
      currency: result.currency,
      key_id: keyId
    });
  } catch {
    return NextResponse.json({ error: "Could not create order." }, { status: 500 });
  }
}
