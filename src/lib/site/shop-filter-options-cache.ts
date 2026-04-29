import "server-only";

import type { ShopFilterOptions } from "@/lib/shop-filter-shared";
import { getShopFilterOptions } from "@/lib/shop-filter-options";
import { getCache, setCache } from "@/lib/cache";

const TTL_MS = 90_000;
const KEY = "products:shop-filter-options";

export async function getShopFilterOptionsCached(): Promise<ShopFilterOptions> {
  const hit = getCache<ShopFilterOptions>(KEY);
  if (hit) return hit;

  const value = await getShopFilterOptions();
  setCache(KEY, value, TTL_MS);
  return value;
}

