import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpayConfig, signRazorpayPayload } from "@/lib/razorpay";

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
      orderId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    };
    const orderId = body.orderId?.trim();
    const razorpayOrderId = body.razorpayOrderId?.trim();
    const razorpayPaymentId = body.razorpayPaymentId?.trim();
    const razorpaySignature = body.razorpaySignature?.trim();

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
      select: { id: true, status: true, paymentMethod: true }
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status === "PAID") {
      return NextResponse.json({ ok: true });
    }

    const expected = signRazorpayPayload(razorpayOrderId, razorpayPaymentId, keySecret);
    if (expected !== razorpaySignature) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        trackingUrl: `razorpay:${razorpayPaymentId}`
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }
}

