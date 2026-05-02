import { NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

type Body = { productIds?: string[] };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const ids = [...new Set((body.productIds ?? []).filter((x): x is string => typeof x === "string" && x.length > 0))];
    if (ids.length === 0) {
      return NextResponse.json({ allowCod: true });
    }
    const supabase = getSupabaseServiceRoleClient();
    const { data: products, error } = await (supabase
      .from("Product") as any)
      .select("id,codEnabled")
      .in("id", ids);
    if (error || !products) {
      return NextResponse.json({ allowCod: false });
    }
    if (products.length !== ids.length) {
      return NextResponse.json({ allowCod: false });
    }
    const allowCod = (products as Array<{ codEnabled: boolean }>).every((p) => p.codEnabled);
    return NextResponse.json({ allowCod });
  } catch {
    return NextResponse.json({ allowCod: false });
  }
}
