import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { stripSearchQuery } from "@/lib/search-query";

export type ShopCatalogSearchRpcRow = {
  id: string;
  search_score: number;
  total_count: number;
};

/**
 * DB signature (public.shop_catalog_search) — keep in sync with migration, do not rename keys:
 * p_query text,
 * p_category text[] DEFAULT ARRAY[]::text[],
 * p_occasion text[] DEFAULT ARRAY[]::text[],
 * p_style text[] DEFAULT ARRAY[]::text[],
 * p_material text[] DEFAULT ARRAY[]::text[],
 * p_min_mrp numeric DEFAULT NULL,
 * p_max_mrp numeric DEFAULT NULL,
 * p_product_ids uuid[] DEFAULT NULL,
 * p_hide_oos boolean DEFAULT false,
 * p_sort text DEFAULT 'new',
 * p_page int DEFAULT 1,
 * p_page_size int DEFAULT 24
 */
export type ShopCatalogSearchRpcParams = {
  query: string;
  category: string[];
  occasion: string[];
  style: string[];
  material: string[];
  minMrp: number | null;
  maxMrp: number | null;
  variantProductIds: string[] | null;
  hideOos: boolean;
  sort: string;
  page: number;
  pageSize: number;
};

function textArray(a: string[] | undefined | null): string[] {
  if (!Array.isArray(a)) return [];
  return a.map((x) => String(x ?? "").trim()).filter((x) => x.length > 0);
}

function nullableNumeric(n: number | null | undefined): number | null {
  if (n == null) return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function intInRange(n: number, min: number, max: number, fallback: number): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

/** Payload PostgREST sends to Postgres — every key present, no `undefined` (omitted keys break overload match). */
export function buildShopCatalogSearchRpcPayload(params: ShopCatalogSearchRpcParams): Record<string, unknown> {
  const p_query = stripSearchQuery(params.query ?? "");
  const p_category = textArray(params.category);
  const p_occasion = textArray(params.occasion);
  const p_style = textArray(params.style);
  const p_material = textArray(params.material);
  const p_min_mrp = nullableNumeric(params.minMrp);
  const p_max_mrp = nullableNumeric(params.maxMrp);
  const ids = Array.isArray(params.variantProductIds) ? params.variantProductIds.filter((x) => typeof x === "string" && x.length > 0) : [];
  const p_product_ids = ids.length > 0 ? ids : null;
  const p_hide_oos = params.hideOos === true;
  const p_sort = String(params.sort ?? "new").trim() || "new";
  const p_page = intInRange(params.page, 1, 1_000_000, 1);
  const p_page_size = intInRange(params.pageSize, 1, 48, 24);

  return {
    p_query,
    p_category,
    p_occasion,
    p_style,
    p_material,
    p_min_mrp,
    p_max_mrp,
    p_product_ids,
    p_hide_oos,
    p_sort,
    p_page,
    p_page_size
  };
}

/**
 * Ranked product ids (Postgres `shop_catalog_search`).
 * Returns empty when stripped `p_query` length &lt; 2 (matches SQL early exit).
 */
export async function shopCatalogSearchRpc(params: ShopCatalogSearchRpcParams): Promise<{ rows: ShopCatalogSearchRpcRow[]; error?: string }> {
  const supabase = getSupabaseServiceRoleClient();
  const rpcBody = buildShopCatalogSearchRpcPayload(params);
  const { data, error } = await (supabase as any).rpc("shop_catalog_search", rpcBody);
  if (error) {
    return { rows: [], error: error.message };
  }
  const raw = (data ?? []) as Array<Record<string, unknown>>;
  const rows: ShopCatalogSearchRpcRow[] = [];
  for (const r of raw) {
    const id = typeof r.id === "string" ? r.id : null;
    if (!id) continue;
    const search_score = typeof r.search_score === "number" ? r.search_score : Number(r.search_score);
    const total_count = (() => {
      const v = (r as { total_count?: unknown }).total_count;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "bigint") return Number(v);
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    })();
    rows.push({
      id,
      search_score: Number.isFinite(search_score) ? search_score : 0,
      total_count
    });
  }
  return { rows };
}
