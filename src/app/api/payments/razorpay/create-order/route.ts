import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizePublicOrderRef } from "@/lib/order-public-ref";
import { getRazorpayConfig } from "@/lib/razorpay";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { keyId, keySecret, enabled } = getRazorpayConfig();
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

    const amount = Math.max(1, Math.round(order.totalAmount * 100));
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: ref.replace(/^#/, "").slice(0, 40),
        notes: { publicOrderRef: ref }
      })
    });
    const rpData = (await rpRes.json()) as RazorpayOrderResponse & { error?: { description?: string } };
    if (!rpRes.ok || !rpData.id) {
      return NextResponse.json({ error: "Could not create Razorpay order." }, { status: 502 });
    }

    return NextResponse.json({
      keyId,
      razorpayOrderId: rpData.id,
      amount: rpData.amount,
      currency: rpData.currency
    });
  } catch {
    console.error("[payments] razorpay order init failed");
    return NextResponse.json({ error: "Could not initialize payment." }, { status: 500 });
  }
}

