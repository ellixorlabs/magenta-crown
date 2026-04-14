import type { Prisma } from "@prisma/client";

export function firstString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export function parseShopSearchParams(sp: Record<string, string | string[] | undefined>) {
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
    cols: firstString(sp.cols),
    view: firstString(sp.view),
    /** When "1", include products with no sellable stock (default: hide them). */
    showOutOfStock: firstString(sp.showOutOfStock)
  };
}

export function buildProductWhere(
  sp: Record<string, string | string[] | undefined>,
  opts?: { applyOutOfStockFilter?: boolean }
): Prisma.ProductWhereInput {
  const p = parseShopSearchParams(sp);
  const applyOosFilter = opts?.applyOutOfStockFilter ?? true;
  const clauses: Prisma.ProductWhereInput[] = [];

  if (p.category) clauses.push({ category: { equals: p.category, mode: "insensitive" } });
  if (p.occasion) clauses.push({ occasion: { equals: p.occasion, mode: "insensitive" } });
  if (p.style) clauses.push({ style: { equals: p.style, mode: "insensitive" } });
  if (p.material) clauses.push({ material: { contains: p.material, mode: "insensitive" } });
  if (p.color) clauses.push({ colors: { has: p.color } });
  if (p.size) clauses.push({ sizes: { has: p.size } });

  const min = p.minPrice ? Number(p.minPrice) : undefined;
  const max = p.maxPrice ? Number(p.maxPrice) : undefined;
  if ((min != null && !Number.isNaN(min)) || (max != null && !Number.isNaN(max))) {
    const mrp: Prisma.FloatFilter = {};
    if (min != null && !Number.isNaN(min)) mrp.gte = min;
    if (max != null && !Number.isNaN(max)) mrp.lte = max;
    clauses.push({ mrp });
  }

  const showOos = p.showOutOfStock === "1" || p.showOutOfStock === "true";
  if (applyOosFilter && !showOos) {
    clauses.push({
      OR: [
        { stockQuantity: { gt: 0 } },
        { variants: { some: { quantity: { gt: 0 } } } }
      ]
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
