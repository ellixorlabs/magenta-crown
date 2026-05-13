/**
 * SEO-friendly category URLs: `/shop/{slug}` ↔ canonical Product.category labels.
 * Slugs are lowercase, hyphenated, ASCII-safe.
 */

function slugifyLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryLabelToSlug(label: string) {
  return slugifyLabel(label);
}

/** Resolve a URL slug to the exact category label from inventory-derived options. */
export function categoryLabelFromSlug(slug: string, knownCategories: readonly string[]): string | null {
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  for (const c of knownCategories) {
    if (slugifyLabel(c) === s) return c;
  }
  return null;
}

/** Public href for a category label (SEO path). */
export function shopCategoryHref(label: string) {
  return `/shop/${categoryLabelToSlug(label)}`;
}

export type SubDimension = "style" | "occasion" | "material";

export type ResolvedSubFilter = { field: SubDimension; value: string };

/**
 * Map `/shop/{category}/{sub}` slug to a single facet (style, occasion, or material) for that category.
 * Uses distinct values seen on active products in that category (bounded scan).
 */
export async function resolveSubSlugForCategory(
  fetchDistinct: (field: SubDimension) => Promise<string[]>,
  subSlug: string
): Promise<ResolvedSubFilter | null> {
  const s = subSlug.trim().toLowerCase();
  if (!s) return null;
  const dims: SubDimension[] = ["style", "occasion", "material"];
  for (const field of dims) {
    const values = await fetchDistinct(field);
    for (const v of values) {
      if (v && slugifyLabel(v) === s) return { field, value: v };
    }
  }
  return null;
}
