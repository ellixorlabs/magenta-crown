import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCouponCodeFormat, normalizeCouponCode } from "@/lib/coupon";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { code?: string };
    const key = normalizeCouponCode(String(body.code ?? ""));
    if (!isValidCouponCodeFormat(key)) {
      return NextResponse.json({ error: "Enter a valid coupon code." }, { status: 400 });
    }

    const coupon = await prisma.coupon.findFirst({
      where: { code: key, isActive: true },
      select: { code: true, discountPct: true }
    });

    if (!coupon) {
      return NextResponse.json({ error: "This coupon code is not valid or inactive." }, { status: 404 });
    }

    return NextResponse.json({
      code: coupon.code,
      discountPct: coupon.discountPct
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not validate coupon." }, { status: 500 });
  }
}
