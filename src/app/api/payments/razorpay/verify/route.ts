import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { normalizePublicOrderRef } from "@/lib/order-public-ref";
import { getRazorpayConfig, signRazorpayPayload } from "@/lib/razorpay";
import { insertOrderTimelineEvent } from "@/lib/order-timeline";
import { notifyMerchAdmins } from "@/lib/ops-notifications";
import { recordCouponUsageIfEligible, type OrderCouponSnapshot } from "@/lib/coupon-analytics";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { enqueueTransactionalEmail } from "@/lib/transactional-email-queue";

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
      .select("id,userId,couponId,discountAmount,totalAmount,orderStatus,paymentStatus,paymentMethod")
      .eq("publicOrderRef", publicRef)
      .eq("userId", session.user.id)
      .maybeSingle();
    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const o = order as OrderCouponSnapshot;
    if (o.paymentStatus === "PAID") {
      return NextResponse.json({ ok: true });
    }

    const expected = signRazorpayPayload(razorpayOrderId, razorpayPaymentId, keySecret);
    if (expected !== razorpaySignature) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    const { error: updateError } = await (supabase
      .from("Order") as any)
      .update({
        paymentStatus: "PAID",
        trackingUrl: `razorpay:${razorpayPaymentId}`
      })
      .eq("id", o.id);
    if (updateError) {
      return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
    }

    await insertOrderTimelineEvent(supabase, {
      orderId: o.id,
      actorId: session.user.id,
      type: "PAYMENT_CONFIRMED",
      title: "Payment received",
      description: "UPI / Razorpay payment verified.",
      metadata: { razorpayPaymentId }
    });

    const { data: ordRow } = await supabase.from("Order").select("publicOrderRef").eq("id", o.id).maybeSingle();
    const pref = (ordRow as { publicOrderRef?: string | null } | null)?.publicOrderRef;
    const refEnc = pref ? encodeURIComponent(pref) : "";
    await notifyMerchAdmins(supabase, {
      type: "PAYMENT_SUCCESS",
      title: "Payment confirmed",
      message: `Order ${pref ?? o.id} paid online.`,
      metadata: { orderId: o.id, razorpayPaymentId },
      actionUrl: refEnc ? `/admin/orders/${refEnc}` : "/admin/orders"
    });

    await recordCouponUsageIfEligible(supabase, {
      id: o.id,
      userId: o.userId,
      couponId: o.couponId,
      discountAmount: o.discountAmount,
      totalAmount: o.totalAmount,
      orderStatus: o.orderStatus,
      paymentStatus: "PAID",
      paymentMethod: o.paymentMethod
    });

    await enqueueTransactionalEmail(supabase, "PAYMENT_SUCCESS", {
      orderId: o.id,
      publicOrderRef: pref ?? "",
      userId: o.userId ?? ""
    });

    return NextResponse.json({ ok: true });
  } catch {
    console.error("[payments] razorpay verify failed");
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }
}
