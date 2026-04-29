import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_IDS = 40;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const raw = (body as { productIds?: unknown }).productIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "productIds must be an array" }, { status: 400 });
  }
  const productIds = raw
    .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 128)
    .slice(0, MAX_IDS);
  if (productIds.length === 0) {
    return NextResponse.json({ coupons: [] as { code: string; discountPct: number }[] });
  }

  const rows = await prisma.productFeaturedCoupon.findMany({
    where: { productId: { in: productIds } },
    include: { coupon: true }
  });

  const byCode = new Map<string, { code: string; discountPct: number }>();
  for (const row of rows) {
    const c = row.coupon;
    if (!c.isActive) continue;
    byCode.set(c.code, { code: c.code, discountPct: c.discountPct });
  }

  return NextResponse.json({ coupons: [...byCode.values()] });
}
