import "server-only";

import { cache } from "react";

import { getShopProductsFromDatabase } from "@/lib/site/shop-products-db";

/** Shop + search catalog; `cache()` dedupes within one RSC pass, DB layer adds short TTL. */
export const getShopProductsCached = cache(getShopProductsFromDatabase);
