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
    q: firstString(sp.q),
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

type ProductLike = {
  category?: string | null;
  occasion?: string | null;
  style?: string | null;
  material?: string | null;
  mrp?: number | null;
  variants?: Array<{ color?: string | null; size?: string | null; isActive?: boolean | null; stock?: number | null }>;
};

export function buildProductWhere(sp: Record<string, string | string[] | undefined>) {
  const p = parseShopSearchParams(sp);
  const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

  const min = p.minPrice ? Number(p.minPrice) : undefined;
  const max = p.maxPrice ? Number(p.maxPrice) : undefined;
  const hideOos = p.hideOutOfStock === "1" || p.hideOutOfStock === "true";

  return (product: ProductLike) => {
    if (p.category && norm(product.category) !== norm(p.category)) return false;
    if (p.occasion && norm(product.occasion) !== norm(p.occasion)) return false;
    if (p.style && norm(product.style) !== norm(p.style)) return false;
    if (p.material && !norm(product.material).includes(norm(p.material))) return false;

    const variants = product.variants ?? [];
    if (
      p.color &&
      !variants.some((v) => !!v.isActive && norm(v.color) === norm(p.color))
    ) return false;
    if (
      p.size &&
      !variants.some((v) => !!v.isActive && norm(v.size) === norm(p.size))
    ) return false;

    const mrp = Number(product.mrp ?? 0);
    if (min != null && !Number.isNaN(min) && mrp < min) return false;
    if (max != null && !Number.isNaN(max) && mrp > max) return false;

    if (hideOos && !variants.some((v) => !!v.isActive && Number(v.stock ?? 0) > 0)) return false;
    return true;
  };
}

type SortableProduct = { mrp?: number; name?: string | null; createdAt?: string | Date | null };

export function buildProductOrderBy(sort: string) {
  const dateTs = (v: string | Date | null | undefined) => (v instanceof Date ? v.getTime() : new Date(v ?? 0).getTime());
  switch (sort) {
    case "price-asc":
      return (a: SortableProduct, b: SortableProduct) => Number(a.mrp ?? 0) - Number(b.mrp ?? 0);
    case "price-desc":
      return (a: SortableProduct, b: SortableProduct) => Number(b.mrp ?? 0) - Number(a.mrp ?? 0);
    case "name":
      return (a: SortableProduct, b: SortableProduct) => (a.name ?? "").localeCompare(b.name ?? "");
    case "new":
    default:
      return (a: SortableProduct, b: SortableProduct) => dateTs(b.createdAt) - dateTs(a.createdAt);
  }
}
