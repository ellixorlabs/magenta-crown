import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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

const listSelect = {
  id: true,
  slug: true,
  name: true,
  category: true,
  mrp: true,
  discountedPrice: true,
  imageUrls: true,
  listImageIndex: true,
  listImagePosition: true,
  createdAt: true,
  newTagExpiresAt: true,
  variants: { select: { stock: true, isActive: true } }
} satisfies Prisma.ProductSelect;

export type ProductListRow = Prisma.ProductGetPayload<{ select: typeof listSelect }>;

function buildWhere(input: Pick<ListProductsParams, "category" | "q">): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (input.category?.trim()) {
    where.category = input.category.trim();
  }
  if (input.q?.trim()) {
    where.name = { contains: input.q.trim(), mode: "insensitive" };
  }
  return where;
}

function orderByForSort(sort: ProductListSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ mrp: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ mrp: "desc" }, { id: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
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
    newTagExpiresAt: p.newTagExpiresAt?.toISOString() ?? null,
    inStock: totalStock > 0,
    createdAt: p.createdAt.toISOString()
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
  const where = buildWhere(input);
  const orderBy = orderByForSort(input.sort);

  const cacheKey = `products:list?page=${page}&pageSize=${pageSize}&category=${input.category ?? ""}&q=${input.q ?? ""}&sort=${input.sort}`;
  const hit = getCache<{ items: ReturnType<typeof toProductListItemDto>[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(cacheKey);
  if (hit) return hit;

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: listSelect
    })
  ]);

  const items = rows.map(toProductListItemDto);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const payload = {
    items,
    pagination: { page, pageSize, total, totalPages }
  };
  setCache(cacheKey, payload, LIST_TTL_MS);
  return payload;
}

const detailSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  story: true,
  mrp: true,
  discountedPrice: true,
  category: true,
  tags: true,
  material: true,
  occasion: true,
  style: true,
  fitNotes: true,
  careInstructions: true,
  sizeChartImageUrl: true,
  codEnabled: true,
  prepaidOfferText: true,
  pricingFootnote: true,
  imageUrls: true,
  listImageIndex: true,
  listImagePosition: true,
  videoUrls: true,
  createdAt: true,
  variants: {
    where: { isActive: true },
    select: { id: true, color: true, size: true, stock: true, isActive: true },
    orderBy: [{ color: "asc" }, { size: "asc" }]
  }
} satisfies Prisma.ProductSelect;

export async function getProductByIdForApi(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: detailSelect
  });
  if (!product) return null;

  const mrp = product.mrp;
  const salePrice = effectiveSalePrice(mrp, product.discountedPrice);
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);

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
    createdAt: product.createdAt.toISOString(),
    variants: product.variants.map((v) => ({
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

  const rows = await prisma.product.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: listSelect
  });
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
  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrls: true,
      mrp: true,
      discountedPrice: true
    }
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrls: p.imageUrls,
    mrp: p.mrp,
    discountedPrice: p.discountedPrice,
    salePrice: effectiveSalePrice(p.mrp, p.discountedPrice)
  }));
}
