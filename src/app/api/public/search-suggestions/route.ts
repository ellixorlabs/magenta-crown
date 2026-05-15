import { NextResponse } from "next/server";
import { stripSearchQuery } from "@/lib/search-query";
import { shopCategoryHref } from "@/lib/shop-category-url";
import { getShopFilterOptionsCached } from "@/lib/site/shop-filter-options-cache";
import { getLiveSearchProductSuggestions } from "@/lib/site/shop-search-autocomplete";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const empty = {
    ok: true as const,
    products: [] as Awaited<ReturnType<typeof getLiveSearchProductSuggestions>>,
    categories: [] as string[],
    styles: [] as string[],
    collections: [] as { label: string; href: string }[]
  };

  const opts = await getShopFilterOptionsCached();
  const collections = (opts.categories ?? []).slice(0, 8).map((label) => ({
    label,
    href: `${shopCategoryHref(label)}?page=1`
  }));

  if (q.length < 1) {
    return NextResponse.json({ ...empty, collections });
  }

  const qn = stripSearchQuery(q);
  const products = await getLiveSearchProductSuggestions(qn || q, 8);

  const catSet = new Set<string>();
  const styleSet = new Set<string>();
  for (const p of products) {
    if (p.category?.trim()) catSet.add(p.category.trim());
    if (p.style?.trim()) styleSet.add(p.style.trim());
  }

  const categories = [...catSet].slice(0, 10);
  const styles = [...styleSet].slice(0, 10);

  return NextResponse.json({
    ok: true as const,
    products,
    categories,
    styles,
    collections
  });
}
