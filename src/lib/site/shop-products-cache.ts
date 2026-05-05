import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { buildProductOrderBy, buildProductWhere, parseShopSearchParams } from "@/lib/shop-query";
import { getCache, setCache } from "@/lib/cache";

const TTL_MS = 90_000;

// Keep payload small for `/shop`:
// - ProductCard only needs a subset of product scalar fields.
// - Shop page needs `variants` for stock + `reviews` ratings for reviewSummary.
type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  category: string;
  mrp: number;
  discountedPrice: number | null;
  imageUrls: string[];
  listImageIndex: number;
  listImagePosition: string;
  createdAt: string | Date;
  tags: string[];
  newTagExpiresAt: string | Date | null;
  material: string | null;
  occasion: string | null;
  style: string | null;
  variants: { stock: number; isActive: boolean; color?: string | null; size?: string | null }[];
  reviews: { rating: number }[];
};

function stableJoin(values: string[]) {
  return [...values].sort().join("\u001f");
}

function buildCacheKey(parsed: ReturnType<typeof parseShopSearchParams>) {
  // Ignore view/cols because they don't change the DB query — they only change layout.
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

export async function getShopProductsCached(sp: Record<string, string | string[] | undefined>) {
  const parsed = parseShopSearchParams(sp);
  const page = parsed.page;
  const pageSize = parsed.pageSize;
  const skip = (page - 1) * pageSize;

  const key = buildCacheKey(parsed);
  const hit = getCache<{ products: ProductRow[]; totalCount: number }>(key);
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

  const where = buildProductWhere(sp);
  const orderBy = buildProductOrderBy(parsed.sort);
  const q = (parsed.q ?? "").trim().toLowerCase();
  const qTokens = q.split(/\s+/).filter(Boolean);
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await (supabase.from("Product") as any)
    .select(
      "id,slug,name,description,category,mrp,discountedPrice,imageUrls,listImageIndex,listImagePosition,createdAt,tags,newTagExpiresAt,material,occasion,style,variants:ProductVariant(stock,isActive,color,size),reviews:Review(rating)"
    )
    .limit(1200);
  if (error) throw new Error(error.message);
  const allProducts = (data ?? []) as ProductRow[];
  const filtered = allProducts.filter((p) => where(p));
  const searched =
    qTokens.length === 0
      ? filtered
      : filtered.filter((p) => {
          const hay = [p.name, p.category, p.material, p.occasion, p.style, p.description, ...(p.tags ?? [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return qTokens.every((t) => hay.includes(t));
        });
  const relevance = (p: ProductRow) => {
    if (!q) return 0;
    const name = (p.name ?? "").toLowerCase();
    const tags = (p.tags ?? []).map((t) => t.toLowerCase());
    const material = (p.material ?? "").toLowerCase();
    const occasion = (p.occasion ?? "").toLowerCase();
    const style = (p.style ?? "").toLowerCase();
    const category = (p.category ?? "").toLowerCase();
    const desc = (p.description ?? "").toLowerCase();
    let score = 0;
    if (name === q) score += 200;
    if (name.startsWith(q)) score += 120;
    if (name.includes(q)) score += 90;
    if (tags.some((t) => t === q)) score += 110;
    if (tags.some((t) => t.includes(q))) score += 70;
    if (material === q) score += 85;
    if (occasion === q) score += 85;
    if (style === q) score += 75;
    if (category === q) score += 65;
    if (desc.includes(q)) score += 25;
    for (const token of qTokens) {
      if (name.includes(token)) score += 20;
      if (tags.some((t) => t.includes(token))) score += 16;
      if (material.includes(token) || occasion.includes(token) || style.includes(token)) score += 12;
      if (category.includes(token)) score += 8;
      if (desc.includes(token)) score += 4;
    }
    return score;
  };
  const sorted = searched.sort((a, b) => {
    const ra = relevance(a);
    const rb = relevance(b);
    if (rb !== ra) return rb - ra;
    return orderBy(a, b);
  });
  const totalCount = sorted.length;
  const products = sorted.slice(skip, skip + pageSize);

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

