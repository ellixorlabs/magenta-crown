import "server-only";

import { discountPercentOffMrp, effectiveSalePrice } from "@/lib/pricing";
import { getCache, setCache } from "@/lib/cache";
import { expandSearchTyposTokens, stripSearchQuery } from "@/lib/search-query";
import { opsLog } from "@/lib/ops-logger";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

const TTL_MS = 30_000;
const FETCH_CAP = 80;

function escapeIlike(s: string) {
  return s.replace(/[%_\\]/g, "\\$&");
}

export type AutocompleteProductDto = {
  id: string;
  slug: string;
  name: string;
  category?: string;
  style?: string | null;
  styleCode?: string | null;
  mrp: number;
  salePrice: number;
  discountPercent: number;
  primaryImageUrl: string | null;
  imageUrls: string[];
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  styleCode: string | null;
  category: string;
  occasion: string | null;
  style: string | null;
  material: string | null;
  tags: string[] | null;
  searchKeywords: string | null;
  searchSynonyms: string | null;
  description: string | null;
  story: string | null;
  mrp: number;
  discountedPrice: number | null;
  imageUrls: string[] | null;
  listImageIndex: number | null;
};

function rowToDto(row: ProductRow): AutocompleteProductDto | null {
  const id = row.id != null ? String(row.id) : "";
  const slug = row.slug ?? "";
  const name = row.name ?? "";
  const mrp = Number(row.mrp);
  const urls = Array.isArray(row.imageUrls) ? row.imageUrls.filter((u): u is string => typeof u === "string") : [];
  const idx = Math.min(
    Math.max(typeof row.listImageIndex === "number" ? row.listImageIndex : Number(row.listImageIndex) || 0, 0),
    Math.max(urls.length - 1, 0)
  );
  const salePrice = effectiveSalePrice(mrp, row.discountedPrice != null ? Number(row.discountedPrice) : null);
  const dRaw = discountPercentOffMrp(mrp, salePrice);
  const discountPercent = typeof dRaw === "number" && Number.isFinite(dRaw) ? dRaw : 0;
  if (!id || !slug || !name || !Number.isFinite(mrp) || !Number.isFinite(salePrice)) return null;
  return {
    id,
    slug,
    name,
    category: row.category ?? undefined,
    style: row.style ?? null,
    styleCode: row.styleCode?.trim() ? row.styleCode.trim() : null,
    mrp,
    salePrice,
    discountPercent,
    primaryImageUrl: urls[idx] ?? urls[0] ?? null,
    imageUrls: urls.slice(0, 4)
  };
}

function rankScore(row: ProductRow, needle: string): number {
  const n = needle.trim().toLowerCase();
  if (!n) return 0;
  const sc = (row.styleCode ?? "").toLowerCase();
  const name = (row.name ?? "").toLowerCase();
  const cat = (row.category ?? "").toLowerCase();
  const occ = (row.occasion ?? "").toLowerCase();
  const sty = (row.style ?? "").toLowerCase();
  const mat = (row.material ?? "").toLowerCase();
  const desc = (row.description ?? "").toLowerCase();
  const stry = (row.story ?? "").toLowerCase();
  const kw = (row.searchKeywords ?? "").toLowerCase();
  const syn = (row.searchSynonyms ?? "").toLowerCase();
  const tagBlob = (row.tags ?? []).join(" ").toLowerCase();

  let s = 0;
  if (sc && sc === n) s += 1_000_000;
  else if (sc && sc.includes(n)) s += 900_000;
  if (name.startsWith(n)) s += 800_000;
  else if (name.includes(n)) s += 700_000;
  for (const t of row.tags ?? []) {
    if (t && t.toLowerCase().includes(n)) {
      s += 500_000;
      break;
    }
  }
  if (tagBlob.includes(n)) s += 480_000;
  if (kw.includes(n)) s += 450_000;
  if (syn.includes(n)) s += 430_000;
  if (occ.includes(n)) s += 400_000;
  if (sty.includes(n)) s += 400_000;
  if (cat.includes(n)) s += 400_000;
  if (mat.includes(n)) s += 350_000;
  if (desc.includes(n)) s += 200_000;
  if (stry.includes(n)) s += 150_000;
  return s;
}

/**
 * Live storefront autocomplete (1+ chars): ILIKE across common text columns + score rank.
 * Not a substitute for ranked `shop_catalog_search` (full search / PDP).
 */
export async function getLiveSearchProductSuggestions(q: string, limit = 8): Promise<AutocompleteProductDto[]> {
  const needle = q.trim();
  if (needle.length < 1) return [];

  const safeNeedle = needle.replace(/,/g, " ").trim();
  if (safeNeedle.length < 1) return [];

  const canonical = expandSearchTyposTokens(stripSearchQuery(safeNeedle));
  const qUse = canonical.length >= 1 ? canonical : safeNeedle;

  const key = `search:autocomplete:${qUse.toLowerCase()}:${limit}`;
  const hit = getCache<AutocompleteProductDto[]>(key);
  if (hit) return hit;

  const pat = `%${escapeIlike(qUse)}%`;
  const ors = [
    `name.ilike.${pat}`,
    `styleCode.ilike.${pat}`,
    `category.ilike.${pat}`,
    `occasion.ilike.${pat}`,
    `style.ilike.${pat}`,
    `material.ilike.${pat}`,
    `searchKeywords.ilike.${pat}`,
    `searchSynonyms.ilike.${pat}`,
    `description.ilike.${pat}`,
    `story.ilike.${pat}`
  ].join(",");

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await (supabase.from("Product") as any)
    .select(
      "id,slug,name,styleCode,category,occasion,style,material,tags,searchKeywords,searchSynonyms,description,story,mrp,discountedPrice,imageUrls,listImageIndex"
    )
    .eq("status", "ACTIVE")
    .or(ors)
    .limit(FETCH_CAP);

  if (error) {
    opsLog("search-autocomplete", "error", error.message, { q: qUse });
    return [];
  }

  const rows = (data ?? []) as ProductRow[];
  const scored = rows
    .map((r) => ({ r, sc: Math.max(1, rankScore(r, qUse)) }))
    .sort((a, b) => b.sc - a.sc || String(a.r.name).localeCompare(String(b.r.name)));

  const out: AutocompleteProductDto[] = [];
  for (const { r } of scored) {
    const dto = rowToDto(r);
    if (dto) out.push(dto);
    if (out.length >= limit) break;
  }

  setCache(key, out, TTL_MS);
  return out;
}
