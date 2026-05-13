import type { MetadataRoute } from "next";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { getCanonicalSiteUrl } from "@/lib/seo";
import { shopCategoryHref } from "@/lib/shop-category-url";

/** Shop discovery URLs (category uses SEO paths; occasion filters stay query-based). */
const SHOP_CATEGORY_LABELS = ["Sarees", "Lehengas", "Kurtas", "Anarkalis", "Gowns"] as const;
const SHOP_CATEGORY_HREFS = SHOP_CATEGORY_LABELS.map((label) => shopCategoryHref(label));
const SHOP_OCCASION_HREFS = ["/shop?occasion=Festive", "/shop?occasion=Wedding"] as const;

const STATIC_PATHS: { path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/shop", changeFrequency: "daily", priority: 0.95 },
  { path: "/categories", changeFrequency: "weekly", priority: 0.85 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/support/contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/support/faqs", changeFrequency: "yearly", priority: 0.5 },
  { path: "/support/shipping", changeFrequency: "yearly", priority: 0.5 },
  { path: "/support/returns", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/refund", changeFrequency: "yearly", priority: 0.3 }
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getCanonicalSiteUrl();
  const now = new Date();

  let productEntries: MetadataRoute.Sitemap = [];
  let categoryShopEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = getSupabaseServiceRoleClient();
    const [{ data: products, error: productsError }, { data: categoryRows, error: categoryError }] =
      await Promise.all([
        (supabase.from("Product") as any).select("slug,createdAt").eq("status", "ACTIVE").order("createdAt", { ascending: false }),
        (supabase.from("Product") as any).select("category").eq("status", "ACTIVE")
      ]);
    if (productsError) throw new Error(productsError.message);
    if (categoryError) throw new Error(categoryError.message);
    productEntries = ((products ?? []) as Array<{ slug: string; createdAt: string }>).map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8
    }));

    const distinctCats = [...new Set(((categoryRows ?? []) as Array<{ category: string }>).map((row) => row.category))];
    categoryShopEntries = distinctCats.map((category) => ({
      url: `${base}${shopCategoryHref(category)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75
    }));
  } catch {
    /* DB unavailable at build — static routes only */
  }

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((s) => ({
    url: `${base}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority
  }));

  const presetShopEntries: MetadataRoute.Sitemap = [...SHOP_CATEGORY_HREFS, ...SHOP_OCCASION_HREFS].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.72
  }));

  const merged: MetadataRoute.Sitemap = [
    ...staticEntries,
    ...presetShopEntries,
    ...categoryShopEntries,
    ...productEntries
  ];
  const seen = new Set<string>();
  return merged.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}
