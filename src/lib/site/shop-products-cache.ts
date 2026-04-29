import "server-only";

import { prisma } from "@/lib/prisma";
import { buildProductOrderBy, buildProductWhere, parseShopSearchParams } from "@/lib/shop-query";
import { getCache, setCache } from "@/lib/cache";

import type { Prisma } from "@prisma/client";

const TTL_MS = 90_000;

// Keep payload small for `/shop`:
// - ProductCard only needs a subset of product scalar fields.
// - Shop page needs `variants` for stock + `reviews` ratings for reviewSummary.
const productSelect = {
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
  tags: true,
  newTagExpiresAt: true,
  material: true,
  occasion: true,
  // Not used directly by ProductCard, but safe for overlay/meta variations.
  style: true,
  // Relations needed for shop UI
  variants: { select: { stock: true, isActive: true } },
  reviews: { select: { rating: true } }
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function buildCacheKey(parsed: ReturnType<typeof parseShopSearchParams>) {
  // Ignore view/cols because they don't change the DB query — they only change layout.
  return `products:shop:${[
    parsed.category ?? "",
    parsed.occasion ?? "",
    parsed.style ?? "",
    parsed.material ?? "",
    parsed.color ?? "",
    parsed.size ?? "",
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

  const [totalCount, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: productSelect
    })
  ]);

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

