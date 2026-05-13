/**
 * Client-safe helpers for mapping a free-text query to navigation targets.
 * Category values must match Product.category; storefront category URLs are `/shop/{slug}`.
 */

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Remove common plural/singular drift for boutique category labels. */
function rootToken(s: string) {
  const t = norm(s);
  if (t.length <= 3) return t;
  if (t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.endsWith("es")) return t.slice(0, -2);
  if (t.endsWith("s")) return t.slice(0, -1);
  return t;
}

export type SearchNavigationIntent =
  | { type: "shop_category"; category: string }
  | { type: "search_page"; q: string };

/**
 * Priority: exact / strong category match for short queries → shop category.
 * Multi-token descriptive queries → dedicated search results page.
 */
export function resolveSearchNavigationIntent(rawQuery: string, categories: readonly string[]): SearchNavigationIntent {
  const q = rawQuery.trim();
  if (!q) return { type: "search_page", q: "" };

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length >= 3) {
    return { type: "search_page", q };
  }

  const qn = norm(q);
  const qRoot = rootToken(qn);

  let best: { category: string; score: number } | null = null;
  for (const c of categories) {
    const cn = norm(c);
    if (!cn) continue;
    const cRoot = rootToken(cn);
    let score = 0;
    if (cn === qn) score = 100;
    else if (cn.startsWith(qn) || qn.startsWith(cn)) score = 85;
    else if (cn.includes(qn) || qn.includes(cn)) score = 70;
    else if (cRoot === qRoot) score = 68;
    else if (cRoot.includes(qRoot) || qRoot.includes(cRoot)) score = 55;
    if (score > 0 && (!best || score > best.score)) {
      best = { category: c, score };
    }
  }

  if (best && best.score >= 68 && tokens.length <= 2) {
    return { type: "shop_category", category: best.category };
  }

  return { type: "search_page", q };
}
