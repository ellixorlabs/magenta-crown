import { NextResponse } from "next/server";
import { isValidCouponCodeFormat, normalizeCouponCode } from "@/lib/coupon";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { code?: string };
    const key = normalizeCouponCode(String(body.code ?? ""));
    if (!isValidCouponCodeFormat(key)) {
      return NextResponse.json({ error: "Enter a valid coupon code." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data: coupon, error } = await supabase
      .from("Coupon")
      .select("code,discountPct")
      .eq("code", key)
      .eq("isActive", true)
      .maybeSingle<{ code: string; discountPct: number }>();
    if (error) {
      return NextResponse.json({ error: "Could not validate coupon." }, { status: 500 });
    }

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
