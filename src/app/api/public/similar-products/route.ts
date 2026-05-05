import { NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { productIds?: string[]; limit?: number };
    const productIds = Array.isArray(body.productIds) ? body.productIds.filter(Boolean) : [];
    if (productIds.length === 0) return NextResponse.json({ products: [] });
    const limit = Math.min(Math.max(Number(body.limit ?? 4), 1), 12);
    const supabase = getSupabaseServiceRoleClient();
    const base = await (supabase.from("Product") as any).select("id,category").in("id", productIds);
    const categories = [...new Set(((base.data ?? []) as Array<{ category?: string }>).map((p) => p.category).filter(Boolean))];
    if (categories.length === 0) return NextResponse.json({ products: [] });
    const similar = await (supabase.from("Product") as any)
      .select(
        "id,slug,name,category,mrp,discountedPrice,imageUrls,listImageIndex,listImagePosition,tags,newTagExpiresAt,material,occasion,style,variants:ProductVariant(stock,isActive)"
      )
      .in("category", categories)
      .order("createdAt", { ascending: false })
      .limit(limit * 3);
    if (similar.error) return NextResponse.json({ error: "Failed to load similar products." }, { status: 500 });
    const exclude = new Set(productIds);
    const products = ((similar.data ?? []) as Array<{ id: string }>).filter((p) => !exclude.has(p.id)).slice(0, limit);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Failed to load similar products." }, { status: 500 });
  }
}
