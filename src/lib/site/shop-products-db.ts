import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { parseShopSearchParams } from "@/lib/shop-query";
import { getCache, setCache } from "@/lib/cache";
import type { ShopProductGridRow } from "@/lib/shop-product-grid-row";

const TTL_MS = 90_000;

function stableJoin(values: string[]) {
  return [...values].sort().join("\u001f");
}

function escapeIlike(s: string) {
  return s.replace(/[%_]/g, "\\$&");
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
    let q = (supabase.from("ProductVariant") as any)
      .select("productId")
      .eq("isActive", true)
      .in("color", colors);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    apply(((data ?? []) as Array<{ productId: string }>).map((r) => r.productId));
  }

  if (sizes.length) {
    let q = (supabase.from("ProductVariant") as any)
      .select("productId")
      .eq("isActive", true)
      .in("size", sizes);
    const { data, error } = await q;
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

/**
 * Server-side shop/search catalog query with pagination (no full-table scan).
 */
export async function getShopProductsFromDatabase(sp: Record<string, string | string[] | undefined>) {
  const parsed = parseShopSearchParams(sp);
  const page = parsed.page;
  const pageSize = parsed.pageSize;
  const skip = (page - 1) * pageSize;

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

  let q = (supabase.from("Product") as any)
    .select(
      "id,slug,name,description,category,mrp,discountedPrice,imageUrls,listImageIndex,listImagePosition,createdAt,tags,newTagExpiresAt,material,occasion,style,variants:ProductVariant(stock,isActive,color,size),reviews:Review(rating)",
      { count: "exact" }
    )
    .eq("status", "ACTIVE");

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
    const ors = parsed.material.map((m) => `material.ilike.%${escapeIlike(m)}%`).join(",");
    q = q.or(ors);
  }

  const min = parsed.minPrice ? Number(parsed.minPrice) : undefined;
  const max = parsed.maxPrice ? Number(parsed.maxPrice) : undefined;
  if (min != null && Number.isFinite(min)) q = q.gte("mrp", min);
  if (max != null && Number.isFinite(max)) q = q.lte("mrp", max);

  const rawQ = (parsed.q ?? "").trim();
  if (rawQ) {
    const like = `%${escapeIlike(rawQ)}%`;
    q = q.or(
      `name.ilike.${like},description.ilike.${like},material.ilike.${like},occasion.ilike.${like},style.ilike.${like},category.ilike.${like}`
    );
  }

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

  const rows = (data ?? []) as ShopProductGridRow[];
  const totalCount = count ?? 0;

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
