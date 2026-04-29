import "server-only";

import { prisma } from "@/lib/prisma";
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
  const [products, agg, variantColors, variantSizes] = await Promise.all([
    prisma.product.findMany({
      select: {
        category: true,
        occasion: true,
        style: true,
        material: true
      }
    }),
    prisma.product.aggregate({
      _min: { mrp: true },
      _max: { mrp: true }
    }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      select: { color: true },
      distinct: ["color"]
    }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      select: { size: true },
      distinct: ["size"]
    })
  ]);

  // UX requirement: always start from 0 and let the max auto-track the current inventory.
  let priceMin = 0;
  let priceMax = Math.ceil(agg._max.mrp ?? 100_000);
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
