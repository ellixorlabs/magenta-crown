import { NextResponse } from "next/server";
import { getShopFilterOptionsCached } from "@/lib/site/shop-filter-options-cache";

export const dynamic = "force-dynamic";
export const revalidate = 120;

/**
 * Public category list for search intent + overlays (cached server-side).
 */
export async function GET() {
  try {
    const opts = await getShopFilterOptionsCached();
    return NextResponse.json({ ok: true as const, categories: opts.categories ?? [] });
  } catch {
    return NextResponse.json({ ok: true as const, categories: [] as string[] });
  }
}
