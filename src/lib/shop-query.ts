import type { Prisma } from "@prisma/client";

export function firstString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function parseGridCols(raw: string | undefined): 2 | 3 | 4 | 5 | 6 | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (n === 2 || n === 3 || n === 4 || n === 5 || n === 6) return n;
  return null;
}

export function parseShopSearchParams(sp: Record<string, string | string[] | undefined>) {
  function parsePage(raw: string | string[] | undefined, fallback: number): number {
    const v =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw) && typeof raw[0] === "string"
          ? raw[0]
          : undefined;
    const n = v ? Number.parseInt(v, 10) : fallback;
    if (!Number.isFinite(n) || n < 1) return fallback;
    return n;
  }

  const DEFAULT_PAGE_SIZE = 24;

  return {
    category: firstString(sp.category),
    occasion: firstString(sp.occasion),
    style: firstString(sp.style),
    material: firstString(sp.material),
    color: firstString(sp.color),
    size: firstString(sp.size),
    minPrice: firstString(sp.minPrice),
    maxPrice: firstString(sp.maxPrice),
    sort: firstString(sp.sort) ?? "new",
    cols: parseGridCols(firstString(sp.cols)),
    view: firstString(sp.view),
    /** When "1", only show products that have at least one active variant with stock &gt; 0 (default: show entire catalog, including zero stock). */
    hideOutOfStock: firstString(sp.hideOutOfStock),
    page: parsePage(sp.page, 1),
    pageSize: Math.min(
      48,
      Math.max(6, parsePage(sp.pageSize, DEFAULT_PAGE_SIZE))
    )
  };
}

export function buildProductWhere(sp: Record<string, string | string[] | undefined>): Prisma.ProductWhereInput {
  const p = parseShopSearchParams(sp);
  const clauses: Prisma.ProductWhereInput[] = [];

  if (p.category) clauses.push({ category: { equals: p.category, mode: "insensitive" } });
  if (p.occasion) clauses.push({ occasion: { equals: p.occasion, mode: "insensitive" } });
  if (p.style) clauses.push({ style: { equals: p.style, mode: "insensitive" } });
  if (p.material) clauses.push({ material: { contains: p.material, mode: "insensitive" } });
  if (p.color) {
    clauses.push({
      variants: {
        some: {
          color: { equals: p.color, mode: "insensitive" },
          isActive: true
        }
      }
    });
  }
  if (p.size) {
    clauses.push({
      variants: {
        some: {
          size: { equals: p.size, mode: "insensitive" },
          isActive: true
        }
      }
    });
  }

  const min = p.minPrice ? Number(p.minPrice) : undefined;
  const max = p.maxPrice ? Number(p.maxPrice) : undefined;
  if ((min != null && !Number.isNaN(min)) || (max != null && !Number.isNaN(max))) {
    const mrp: Prisma.FloatFilter = {};
    if (min != null && !Number.isNaN(min)) mrp.gte = min;
    if (max != null && !Number.isNaN(max)) mrp.lte = max;
    clauses.push({ mrp });
  }

  const hideOos = p.hideOutOfStock === "1" || p.hideOutOfStock === "true";
  if (hideOos) {
    clauses.push({
      variants: {
        some: {
          isActive: true,
          stock: { gt: 0 }
        }
      }
    });
  }

  if (clauses.length === 0) return {};
  return { AND: clauses };
}

export function buildProductOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { mrp: "asc" };
    case "price-desc":
      return { mrp: "desc" };
    case "name":
      return { name: "asc" };
    case "new":
    default:
      return { createdAt: "desc" };
  }
}
