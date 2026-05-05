import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizePublicOrderRef } from "@/lib/order-public-ref";
import { getRazorpayConfig, signRazorpayPayload } from "@/lib/razorpay";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

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

    const body = (await req.json()) as {
      publicOrderRef?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    };
    const publicRef = normalizePublicOrderRef(body.publicOrderRef);
    const razorpayOrderId = body.razorpayOrderId?.trim();
    const razorpayPaymentId = body.razorpayPaymentId?.trim();
    const razorpaySignature = body.razorpaySignature?.trim();

    if (!publicRef || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data: order, error: orderError } = await supabase
      .from("Order")
      .select("id,status,paymentMethod")
      .eq("publicOrderRef", publicRef)
      .eq("userId", session.user.id)
      .maybeSingle<{ id: string; status: string; paymentMethod: string | null }>();
    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status === "PAID") {
      return NextResponse.json({ ok: true });
    }

    const expected = signRazorpayPayload(razorpayOrderId, razorpayPaymentId, keySecret);
    if (expected !== razorpaySignature) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    const { data: lines, error: linesError } = await (supabase.from("OrderItem") as any)
      .select("id,quantity,variantId")
      .eq("orderId", order.id);
    if (linesError) {
      return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
    }

    const orderLines = (lines ?? []) as Array<{ id: string; quantity: number; variantId: string | null }>;
    for (const line of orderLines) {
      if (!line.variantId) {
        return NextResponse.json({ error: "Order line is missing a variant. Please retry payment." }, { status: 409 });
      }
      const { data: variant, error: variantErr } = await (supabase.from("ProductVariant") as any)
        .select("id,stock,isActive")
        .eq("id", line.variantId)
        .maybeSingle();
      if (variantErr || !variant) {
        return NextResponse.json({ error: "Some items are unavailable. Please retry or choose COD." }, { status: 409 });
      }
      if (!variant.isActive || variant.stock < line.quantity) {
        return NextResponse.json(
          { error: "Some items sold out during payment. Please retry payment or switch to cash on delivery." },
          { status: 409 }
        );
      }
      const { error: stockErr } = await (supabase.from("ProductVariant") as any)
        .update({ stock: Math.max(0, variant.stock - line.quantity) })
        .eq("id", variant.id);
      if (stockErr) {
        return NextResponse.json({ error: "Could not finalize stock. Please retry payment." }, { status: 500 });
      }
    }

    const { error: updateError } = await (supabase
      .from("Order") as any)
      .update({
        status: "PAID",
        trackingUrl: `razorpay:${razorpayPaymentId}`
      })
      .eq("id", order.id);
    if (updateError) {
      return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    console.error("[payments] razorpay verify failed");
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }
}

