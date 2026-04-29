import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRazorpayConfig } from "@/lib/razorpay";

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

    const body = (await req.json()) as { orderId?: string };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
      select: { id: true, totalAmount: true, publicOrderRef: true, status: true }
    });
    if (!order) {
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
        receipt: order.publicOrderRef ?? order.id.slice(0, 24),
        notes: { orderId: order.id }
      })
    });
    const rpData = (await rpRes.json()) as RazorpayOrderResponse & { error?: { description?: string } };
    if (!rpRes.ok || !rpData.id) {
      return NextResponse.json({ error: rpData.error?.description ?? "Could not create Razorpay order." }, { status: 502 });
    }

    return NextResponse.json({
      keyId,
      razorpayOrderId: rpData.id,
      amount: rpData.amount,
      currency: rpData.currency
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not initialize payment." }, { status: 500 });
  }
}

