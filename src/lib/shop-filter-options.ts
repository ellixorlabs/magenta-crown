import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { ShopFilterOptions } from "@/lib/shop-filter-shared";

export type { ShopFilterOptions } from "@/lib/shop-filter-shared";
export { PRICE_BUCKETS, priceBucketToMinMax, minMaxToPriceBucket } from "@/lib/shop-filter-shared";

function uniqSorted(values: (string | null | undefined)[]): string[] {
  const s = new Set<string>();
  for (const v of values) {
    const t = v?.trim();
    if (t) s.add(t);
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

export async function getShopFilterOptions(): Promise<ShopFilterOptions> {
  const supabase = getSupabaseServiceRoleClient();
  const [productsRes, variantColorsRes, variantSizesRes] = await Promise.all([
    (supabase.from("Product") as any).select("category,occasion,style,material,mrp"),
    (supabase.from("ProductVariant") as any).select("color").eq("isActive", true),
    (supabase.from("ProductVariant") as any).select("size").eq("isActive", true)
  ]);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (variantColorsRes.error) throw new Error(variantColorsRes.error.message);
  if (variantSizesRes.error) throw new Error(variantSizesRes.error.message);
  const products = (productsRes.data ?? []) as Array<{ category: string; occasion: string | null; style: string | null; material: string | null; mrp: number }>;
  const variantColors = (variantColorsRes.data ?? []) as Array<{ color: string | null }>;
  const variantSizes = (variantSizesRes.data ?? []) as Array<{ size: string | null }>;

  // UX requirement: always start from 0 and let the max auto-track the current inventory.
  let priceMin = 0;
  let priceMax = Math.ceil(Math.max(0, ...products.map((p) => p.mrp ?? 0), 100_000));
  if (!Number.isFinite(priceMax) || priceMax <= priceMin) priceMax = Math.max(priceMin + 1000, 100_000);

  return {
    categories: uniqSorted(products.map((p) => p.category)),
    occasions: uniqSorted(products.map((p) => p.occasion)),
    styles: uniqSorted(products.map((p) => p.style)),
    materials: uniqSorted(products.map((p) => p.material)),
    colors: uniqSorted(variantColors.map((c) => c.color)),
    sizes: uniqSorted(variantSizes.map((s) => s.size)),
    priceMin,
    priceMax
  };
}
