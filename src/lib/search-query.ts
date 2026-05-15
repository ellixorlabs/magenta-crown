/**
 * Client/server query normalize for search UX (keep token map aligned with
 * `expand_search_typos` in supabase/migrations/*luxury_product_search.sql).
 */

export function stripSearchQuery(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/**
 * `shop_catalog_search` requires stripped query length ≥ 2. When user `q` is short/empty,
 * derive a text token from facet params so path-based shop (e.g. category) still hits RPC.
 */
export function effectiveShopCatalogTextQuery(args: {
  q?: string | null;
  category: string[];
  occasion: string[];
  style: string[];
  material: string[];
}): string {
  const fromQ = stripSearchQuery(args.q ?? "");
  if (fromQ.length >= 2) return fromQ;
  for (const list of [args.category, args.style, args.occasion, args.material]) {
    for (const v of list) {
      const s = stripSearchQuery(v);
      if (s.length >= 2) return s;
    }
  }
  return fromQ;
}

/** Same token substitutions as DB `expand_search_typos` (order: longer tokens first). */
export function expandSearchTyposTokens(stripped: string): string {
  let s = stripped;
  const rules: Array<[RegExp, string]> = [
    [/\bkurtees\b/gi, "kurti"],
    [/\bkurtee\b/gi, "kurti"],
    [/\bkurthi\b/gi, "kurta"],
    [/\bkurtha\b/gi, "kurta"],
    [/\bkurti\b/gi, "kurta"],
    [/\blehanga\b/gi, "lehenga"],
    [/\blehangas\b/gi, "lehenga"],
    [/\banarkalli\b/gi, "anarkali"],
    [/\banarkalis\b/gi, "anarkali"],
    [/\bsari\b/gi, "saree"],
    [/\bsaris\b/gi, "saree"],
    [/\bshari\b/gi, "saree"],
    [/\bfestival\b/gi, "festive"],
    [/\bfestivals\b/gi, "festive"],
    [/\bsalvar\b/gi, "salwar"],
    [/\bsalwaar\b/gi, "salwar"],
    [/\bshalwar\b/gi, "salwar"],
    [/\bchaniya\b/gi, "ghagra"],
    [/\bgagra\b/gi, "ghagra"]
  ];
  for (const [re, rep] of rules) {
    s = s.replace(re, rep);
  }
  return s.replace(/\s+/g, " ").trim();
}

export function normalizeSearchQueryForDisplay(raw: string): { raw: string; canonical: string } {
  const rawStripped = stripSearchQuery(raw);
  return { raw: rawStripped, canonical: expandSearchTyposTokens(rawStripped) };
}

/** Heuristic keyword suggestions for admin "Search keywords" field. */
export function suggestSearchKeywords(input: {
  name: string;
  category: string;
  occasion: string;
  tags: string;
}): string {
  const parts: string[] = [];
  const name = input.name.trim();
  if (name) {
    for (const w of name.split(/\s+/)) {
      const t = w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (t.length > 3 && !parts.includes(t)) parts.push(t);
    }
  }
  const cat = input.category.trim();
  if (cat && !parts.some((p) => p === cat.toLowerCase())) parts.push(cat.toLowerCase());
  const occ = input.occasion.trim();
  if (occ && !parts.some((p) => p === occ.toLowerCase())) parts.push(occ.toLowerCase());
  for (const tag of input.tags.split(/[,\n]/)) {
    const t = tag.trim().toLowerCase();
    if (t && t.length > 1 && !parts.includes(t)) parts.push(t);
  }
  return parts.slice(0, 24).join(", ");
}

/** When search returns zero rows, nudge shopper toward plausible categories. */
export function relatedCategoriesForSearchQuery(
  query: string,
  categories: readonly string[],
  limit = 8
): string[] {
  const n = stripSearchQuery(query);
  if (!n || !categories.length) return [...categories].slice(0, limit);
  const toks = n.split(/\s+/).filter((t) => t.length > 1);
  const scored = categories
    .map((c) => {
      const lc = c.toLowerCase();
      let s = 0;
      for (const t of toks) {
        if (lc.includes(t)) s += 4;
        if (t.length > 3 && lc.includes(t.slice(0, Math.max(3, t.length - 1)))) s += 1;
      }
      return { c, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
  const merged = [...new Set([...scored, ...categories])];
  return merged.slice(0, limit);
}
