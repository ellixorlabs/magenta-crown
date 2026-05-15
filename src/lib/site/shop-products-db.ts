import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { effectiveShopCatalogTextQuery } from "@/lib/search-query";
import { parseShopSearchParams } from "@/lib/shop-query";
import { getCache, setCache } from "@/lib/cache";
import type { ShopProductGridRow } from "@/lib/shop-product-grid-row";
import { shopCatalogSearchRpc } from "@/lib/site/shop-search-rpc";

const TTL_MS = 90_000;

function stableJoin(values: string[]) {
  return [...values].sort().join("\u001f");
}

function buildCacheKey(parsed: ReturnType<typeof parseShopSearchParams>) {
  return `products:shop:${[
    parsed.q ?? "",
    stableJoin(parsed.category),
    stableJoin(parsed.occasion),
    stableJoin(parsed.style),
    stableJoin(parsed.material),
    stableJoin(parsed.color),
    stableJoin(parsed.size),
    parsed.minPrice ?? "",
    parsed.maxPrice ?? "",
    parsed.sort ?? "new",
    parsed.hideOutOfStock ?? "",
    String(parsed.page),
    String(parsed.pageSize)
  ].join("|")}`;
}

async function variantFilteredProductIds(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  parsed: ReturnType<typeof parseShopSearchParams>
): Promise<string[] | null> {
  const hideOos = parsed.hideOutOfStock === "1" || parsed.hideOutOfStock === "true";
  const colors = parsed.color;
  const sizes = parsed.size;
  if (!hideOos && !colors.length && !sizes.length) return null;

  const intersect = (a: Set<string>, b: Set<string>) => new Set([...a].filter((x) => b.has(x)));

  let acc: Set<string> | null = null;

  const apply = (ids: string[]) => {
    const s = new Set(ids);
    acc = acc ? intersect(acc, s) : s;
  };

  if (colors.length) {
    const { data, error } = await (supabase.from("ProductVariant") as any)
      .select("productId")
      .eq("isActive", true)
      .in("color", colors);
    if (error) throw new Error(error.message);
    apply(((data ?? []) as Array<{ productId: string }>).map((r) => r.productId));
  }

  if (sizes.length) {
    const { data, error } = await (supabase.from("ProductVariant") as any)
      .select("productId")
      .eq("isActive", true)
      .in("size", sizes);
    if (error) throw new Error(error.message);
    apply(((data ?? []) as Array<{ productId: string }>).map((r) => r.productId));
  }

  if (hideOos) {
    const { data, error } = await (supabase.from("ProductVariant") as any)
      .select("productId")
      .eq("isActive", true)
      .gt("stock", 0);
    if (error) throw new Error(error.message);
    apply(((data ?? []) as Array<{ productId: string }>).map((r) => r.productId));
  }

  return acc ? [...acc] : null;
}

const PRODUCT_GRID_SELECT =
  "id,slug,name,description,category,mrp,discountedPrice,imageUrls,listImageIndex,listImagePosition,createdAt,tags,newTagExpiresAt,material,occasion,style,variants:ProductVariant(stock,isActive,color,size),reviews:Review(rating)";

async function fetchProductsByIdsOrdered(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  idOrder: string[]
): Promise<ShopProductGridRow[]> {
  const { data, error } = await (supabase.from("Product") as any)
    .select(PRODUCT_GRID_SELECT)
    .eq("status", "ACTIVE")
    .in("id", idOrder);
  if (error) throw new Error(error.message);
  const orderIdx = new Map(idOrder.map((id, i) => [id, i]));
  return ((data ?? []) as ShopProductGridRow[])
    .map((r) => ({ ...r, id: String((r as { id: unknown }).id) }))
    .sort((a, b) => (orderIdx.get(a.id) ?? 0) - (orderIdx.get(b.id) ?? 0));
}

/** Plain `/shop` browse when no facet yields a 2+ char RPC text token (RPC early-exits on short `p_query`). */
async function shopBrowseProductPage(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  parsed: ReturnType<typeof parseShopSearchParams>,
  variantIds: string[] | null,
  page: number,
  pageSize: number
): Promise<{ products: ShopProductGridRow[]; totalCount: number }> {
  const skip = (page - 1) * pageSize;
  let q = (supabase.from("Product") as any).select(PRODUCT_GRID_SELECT, { count: "exact" }).eq("status", "ACTIVE");

  if (variantIds?.length) {
    q = q.in("id", variantIds);
  }
  if (parsed.category.length) {
    q = q.in("category", parsed.category);
  }
  if (parsed.occasion.length) {
    q = q.in("occasion", parsed.occasion);
  }
  if (parsed.style.length) {
    q = q.in("style", parsed.style);
  }
  if (parsed.material.length) {
    q = q.in("material", parsed.material);
  }

  const min = parsed.minPrice ? Number(parsed.minPrice) : undefined;
  const max = parsed.maxPrice ? Number(parsed.maxPrice) : undefined;
  if (min != null && Number.isFinite(min)) q = q.gte("mrp", min);
  if (max != null && Number.isFinite(max)) q = q.lte("mrp", max);

  const sort = parsed.sort;
  if (sort === "price-asc" || sort === "price_asc") {
    q = q.order("mrp", { ascending: true }).order("id", { ascending: true });
  } else if (sort === "price-desc" || sort === "price_desc") {
    q = q.order("mrp", { ascending: false }).order("id", { ascending: false });
  } else if (sort === "name") {
    q = q.order("name", { ascending: true }).order("id", { ascending: true });
  } else {
    q = q.order("createdAt", { ascending: false }).order("id", { ascending: false });
  }

  const { data, error, count } = await q.range(skip, skip + pageSize - 1);
  if (error) throw new Error(error.message);
  return { products: (data ?? []) as ShopProductGridRow[], totalCount: count ?? 0 };
}

/**
 * Server-side shop/search catalog. Text ranking + filters = `shop_catalog_search` only (no name ILIKE / client match).
 */
export async function getShopProductsFromDatabase(sp: Record<string, string | string[] | undefined>) {
  const parsed = parseShopSearchParams(sp);
  const page = parsed.page;
  const pageSize = parsed.pageSize;

  const key = buildCacheKey(parsed);
  const hit = getCache<{ products: ShopProductGridRow[]; totalCount: number }>(key);
  if (hit) {
    return {
      products: hit.products,
      totalCount: hit.totalCount,
      pagination: {
        page,
        pageSize,
        total: hit.totalCount,
        totalPages: Math.max(1, Math.ceil(hit.totalCount / pageSize))
      }
    };
  }

  const supabase = getSupabaseServiceRoleClient();
  const variantIds = await variantFilteredProductIds(supabase, parsed);
  if (variantIds && variantIds.length === 0) {
    const empty = { products: [] as ShopProductGridRow[], totalCount: 0 };
    setCache(key, empty, TTL_MS);
    return {
      products: empty.products,
      totalCount: 0,
      pagination: { page, pageSize, total: 0, totalPages: 1 }
    };
  }

  const textQ = effectiveShopCatalogTextQuery({
    q: parsed.q,
    category: parsed.category,
    occasion: parsed.occasion,
    style: parsed.style,
    material: parsed.material
  });

  if (textQ.length < 2) {
    const { products, totalCount } = await shopBrowseProductPage(supabase, parsed, variantIds, page, pageSize);
    setCache(key, { products, totalCount }, TTL_MS);
    return {
      products,
      totalCount,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize))
      }
    };
  }

  const minN = parsed.minPrice ? Number(parsed.minPrice) : null;
  const maxN = parsed.maxPrice ? Number(parsed.maxPrice) : null;
  const hideOos = parsed.hideOutOfStock === "1" || parsed.hideOutOfStock === "true";
  const { rows: ranked, error: rpcErr } = await shopCatalogSearchRpc({
    query: textQ,
    category: parsed.category,
    occasion: parsed.occasion,
    style: parsed.style,
    material: parsed.material,
    minMrp: minN != null && Number.isFinite(minN) ? minN : null,
    maxMrp: maxN != null && Number.isFinite(maxN) ? maxN : null,
    variantProductIds: variantIds,
    hideOos,
    sort: parsed.sort ?? "new",
    page,
    pageSize
  });

  if (rpcErr) {
    console.error("[getShopProductsFromDatabase] shop_catalog_search failed:", rpcErr);
    const empty = { products: [] as ShopProductGridRow[], totalCount: 0 };
    return {
      products: empty.products,
      totalCount: 0,
      pagination: { page, pageSize, total: 0, totalPages: 1 }
    };
  }

  const totalCount = ranked[0]?.total_count ?? 0;
  if (ranked.length === 0) {
    const empty = { products: [] as ShopProductGridRow[], totalCount: 0 };
    setCache(key, empty, TTL_MS);
    return {
      products: empty.products,
      totalCount: 0,
      pagination: { page, pageSize, total: 0, totalPages: 1 }
    };
  }

  const idOrder = ranked.map((r) => String(r.id));
  const rows = await fetchProductsByIdsOrdered(supabase, idOrder);
  setCache(key, { products: rows, totalCount }, TTL_MS);
  return {
    products: rows,
    totalCount,
    pagination: {
      page,
      pageSize,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize))
    }
  };
}

/** Distinct facet values for a category (used to resolve `/shop/cat/sub` slugs). */
export async function getDistinctProductFacetsForCategory(
  categoryLabel: string,
  field: "style" | "occasion" | "material"
): Promise<string[]> {
  const supabase = getSupabaseServiceRoleClient();
  const col = field;
  const { data, error } = await (supabase.from("Product") as any)
    .select(col)
    .eq("status", "ACTIVE")
    .eq("category", categoryLabel)
    .limit(800);
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  for (const row of (data ?? []) as Array<Record<string, string | null>>) {
    const v = row[col];
    if (v && String(v).trim()) set.add(String(v).trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
