import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizePublicOrderRef } from "@/lib/order-public-ref";
import { createRazorpayOrderRest, getRazorpayConfig } from "@/lib/razorpay";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { keyId, enabled } = getRazorpayConfig();
    if (!enabled) {
      return NextResponse.json({ error: "Razorpay is not configured on server." }, { status: 500 });
    }

    const body = (await req.json()) as { publicOrderRef?: string };
    const ref = normalizePublicOrderRef(body.publicOrderRef);
    if (!ref) {
      return NextResponse.json({ error: "publicOrderRef is required." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data: order, error: orderError } = await supabase
      .from("Order")
      .select("id,totalAmount,publicOrderRef,status")
      .eq("publicOrderRef", ref)
      .eq("userId", session.user.id)
      .maybeSingle<{ id: string; totalAmount: number; publicOrderRef: string | null; status: string }>();
    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status === "PAID") {
      return NextResponse.json({ error: "Order already paid." }, { status: 409 });
    }

    const amountPaise = Math.round(order.totalAmount * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return NextResponse.json(
        { error: "Order total is below the minimum for online payment (₹1.00)." },
        { status: 400 }
      );
    }

    const result = await createRazorpayOrderRest({
      amountPaise,
      currency: "INR",
      receipt: ref.replace(/^#/, "").slice(0, 40),
      notes: { publicOrderRef: ref }
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      keyId,
      razorpayOrderId: result.id,
      amount: result.amount,
      currency: result.currency
    });
  } catch {
    console.error("[payments] razorpay order init failed");
    return NextResponse.json({ error: "Could not initialize payment." }, { status: 500 });
  }
}

