/**
 * Canonical site origin for metadata, JSON-LD, and sitemap URLs.
 * Set NEXT_PUBLIC_SITE_URL in production (no trailing slash).
 */
export function getCanonicalSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const base = getCanonicalSiteUrl();
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}

/** Meta description: one line, max length for Google snippets. */
export function truncateMetaDescription(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export function buildProductMetaDescription(product: {
  name: string;
  description: string;
  category: string;
  occasion?: string | null;
  material?: string | null;
}): string {
  const primary = product.description?.trim() || `${product.name} — ${product.category} at Magenta Crown.`;
  return truncateMetaDescription(primary);
}

export function buildProductKeywords(product: {
  name: string;
  category: string;
  tags: string[];
  occasion?: string | null;
  style?: string | null;
  material?: string | null;
}): string {
  const parts = [
    product.name,
    product.category,
    ...product.tags,
    product.occasion,
    product.style,
    product.material,
    "Magenta Crown",
    "luxury occasionwear"
  ].filter(Boolean) as string[];
  return [...new Set(parts.map((p) => p.trim()).filter(Boolean))].join(", ");
}

/** Accessible + SEO-friendly image alt for product imagery. */
export function productImageAlt(product: {
  name: string;
  category: string;
  material?: string | null;
  occasion?: string | null;
}): string {
  const bits = [product.name, product.category];
  if (product.material?.trim()) bits.push(product.material.trim());
  if (product.occasion?.trim()) bits.push(product.occasion.trim());
  return bits.join(" — ");
}
