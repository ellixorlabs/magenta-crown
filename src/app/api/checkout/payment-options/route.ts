import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = { productIds?: string[] };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const ids = [...new Set((body.productIds ?? []).filter((x): x is string => typeof x === "string" && x.length > 0))];
    if (ids.length === 0) {
      return NextResponse.json({ allowCod: true });
    }
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { codEnabled: true }
    });
    if (products.length !== ids.length) {
      return NextResponse.json({ allowCod: false });
    }
    const allowCod = products.every((p) => p.codEnabled);
    return NextResponse.json({ allowCod });
  } catch {
    return NextResponse.json({ allowCod: false });
  }
}
