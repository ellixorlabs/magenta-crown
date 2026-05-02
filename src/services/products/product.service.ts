import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { discountPercentOffMrp, effectiveSalePrice } from "@/lib/pricing";
import { getCache, setCache } from "@/lib/cache";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const LIST_TTL_MS = 90_000;
const LATEST_TTL_MS = 60_000;

export type ProductListSort = "newest" | "price_asc" | "price_desc";

export type ListProductsParams = {
  page: number;
  pageSize: number;
  category?: string;
  q?: string;
  sort: ProductListSort;
};

export type ProductListRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  mrp: number;
  discountedPrice: number | null;
  imageUrls: string[];
  listImageIndex: number;
  listImagePosition: string;
  createdAt: string | Date;
  newTagExpiresAt: string | Date | null;
  variants: { stock: number; isActive: boolean }[];
};

function toDate(value: string | Date | null | undefined) {
  return value instanceof Date ? value : new Date(value ?? 0);
}

/** Compact list row for JSON APIs (limits image array size for mobile payloads). */
export function toProductListItemDto(p: ProductListRow) {
  const totalStock = p.variants
    .filter((v) => v.isActive)
    .reduce((s, v) => s + v.stock, 0);
  const mrp = p.mrp;
  const salePrice = effectiveSalePrice(mrp, p.discountedPrice);
  const urls = p.imageUrls ?? [];
  const idx = Math.min(Math.max(p.listImageIndex, 0), Math.max(urls.length - 1, 0));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    mrp,
    salePrice,
    discountPercent: discountPercentOffMrp(mrp, salePrice),
    primaryImageUrl: urls[idx] ?? urls[0] ?? null,
    /** First few gallery URLs — full gallery on PDP endpoint. */
    imageUrls: urls.slice(0, 4),
    listImageIndex: p.listImageIndex,
    listImagePosition: p.listImagePosition,
    newTagExpiresAt: p.newTagExpiresAt ? toDate(p.newTagExpiresAt).toISOString() : null,
    inStock: totalStock > 0,
    createdAt: toDate(p.createdAt).toISOString()
  };
}

export function normalizeListParams(raw: {
  page?: string | null;
  pageSize?: string | null;
  category?: string | null;
  q?: string | null;
  sort?: string | null;
}): ListProductsParams {
  const page = Math.max(1, parseInt(raw.page ?? "1", 10) || 1);
  const rawSize = parseInt(raw.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize));
  const sortRaw = (raw.sort ?? "newest").toLowerCase();
  const sort: ProductListSort =
    sortRaw === "price_asc" || sortRaw === "priceasc"
      ? "price_asc"
      : sortRaw === "price_desc" || sortRaw === "pricedesc"
        ? "price_desc"
        : "newest";
  return {
    page,
    pageSize,
    category: raw.category ?? undefined,
    q: raw.q ?? undefined,
    sort
  };
}

export async function listProductsForApi(input: ListProductsParams) {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize));
  const skip = (page - 1) * pageSize;
  const supabase = getSupabaseServiceRoleClient();

  const cacheKey = `products:list?page=${page}&pageSize=${pageSize}&category=${input.category ?? ""}&q=${input.q ?? ""}&sort=${input.sort}`;
  const hit = getCache<{ items: ReturnType<typeof toProductListItemDto>[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(cacheKey);
  if (hit) return hit;

  let query = (supabase.from("Product") as any).select(
    "id,slug,name,category,mrp,discountedPrice,imageUrls,listImageIndex,listImagePosition,createdAt,newTagExpiresAt,variants:ProductVariant(stock,isActive)",
    { count: "exact" }
  );
  if (input.category?.trim()) query = query.eq("category", input.category.trim());
  if (input.q?.trim()) query = query.ilike("name", `%${input.q.trim()}%`);
  if (input.sort === "price_asc") query = query.order("mrp", { ascending: true }).order("id", { ascending: true });
  else if (input.sort === "price_desc") query = query.order("mrp", { ascending: false }).order("id", { ascending: false });
  else query = query.order("createdAt", { ascending: false }).order("id", { ascending: false });
  const { data, error, count } = await query.range(skip, skip + pageSize - 1);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ProductListRow[];
  const total = count ?? 0;

  const items = rows.map(toProductListItemDto);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const payload = {
    items,
    pagination: { page, pageSize, total, totalPages }
  };
  setCache(cacheKey, payload, LIST_TTL_MS);
  return payload;
}

export async function getProductByIdForApi(id: string) {
  const supabase = getSupabaseServiceRoleClient();
  const { data: product, error } = await (supabase.from("Product") as any)
    .select(
      "id,slug,name,description,story,mrp,discountedPrice,category,tags,material,occasion,style,fitNotes,careInstructions,sizeChartImageUrl,codEnabled,prepaidOfferText,pricingFootnote,imageUrls,listImageIndex,listImagePosition,videoUrls,createdAt,variants:ProductVariant(id,color,size,stock,isActive)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!product) return null;
  const activeVariants = ((product.variants ?? []) as Array<{ id: string; color: string; size: string; stock: number; isActive: boolean }>)
    .filter((v) => v.isActive)
    .sort((a, b) => a.color.localeCompare(b.color) || a.size.localeCompare(b.size));

  const mrp = product.mrp;
  const salePrice = effectiveSalePrice(mrp, product.discountedPrice);
  const totalStock = activeVariants.reduce((s, v) => s + v.stock, 0);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    story: product.story,
    category: product.category,
    tags: product.tags,
    material: product.material,
    occasion: product.occasion,
    style: product.style,
    fitNotes: product.fitNotes,
    careInstructions: product.careInstructions,
    sizeChartImageUrl: product.sizeChartImageUrl,
    codEnabled: product.codEnabled,
    prepaidOfferText: product.prepaidOfferText,
    pricingFootnote: product.pricingFootnote,
    mrp,
    salePrice,
    discountPercent: discountPercentOffMrp(mrp, salePrice),
    imageUrls: product.imageUrls,
    listImageIndex: product.listImageIndex,
    listImagePosition: product.listImagePosition,
    videoUrls: product.videoUrls,
    inStock: totalStock > 0,
    createdAt: toDate(product.createdAt).toISOString(),
    variants: activeVariants.map((v) => ({
      id: v.id,
      color: v.color,
      size: v.size,
      stock: v.stock,
      inStock: v.stock > 0
    }))
  };
}

export async function getLatestProductsForApi(limit: number) {
  const take = Math.min(MAX_PAGE_SIZE, Math.max(1, limit));
  const cacheKey = `products:latest?take=${take}`;
  const hit = getCache<{ items: ReturnType<typeof toProductListItemDto>[] }>(cacheKey);
  if (hit) return hit;

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await (supabase.from("Product") as any)
    .select("id,slug,name,category,mrp,discountedPrice,imageUrls,listImageIndex,listImagePosition,createdAt,newTagExpiresAt,variants:ProductVariant(stock,isActive)")
    .order("createdAt", { ascending: false })
    .order("id", { ascending: false })
    .limit(take);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ProductListRow[];
  const payload = { items: rows.map(toProductListItemDto) };
  setCache(cacheKey, payload, LATEST_TTL_MS);
  return payload;
}

/**
 * Minimal product rows by id list — preserves caller order.
 * Shape matches legacy `/api/products/by-ids` (adds optional `salePrice` for mobile clients).
 */
export async function getProductsByIdsForApi(ids: string[]) {
  if (ids.length === 0) return [];
  const supabase = getSupabaseServiceRoleClient();
  const { data: rows, error } = await (supabase.from("Product") as any)
    .select("id,slug,name,imageUrls,mrp,discountedPrice")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const order = new Map(ids.map((id, i) => [id, i]));
  const list = ((rows ?? []) as Array<{ id: string; slug: string; name: string; imageUrls: string[]; mrp: number; discountedPrice: number | null }>)
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return list.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrls: p.imageUrls,
    mrp: p.mrp,
    discountedPrice: p.discountedPrice,
    salePrice: effectiveSalePrice(p.mrp, p.discountedPrice)
  }));
}
