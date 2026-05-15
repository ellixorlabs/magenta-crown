import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { isStorefrontStaff } from "@/lib/admin-permissions";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { EmptyState } from "@/components/empty/EmptyState";
import { getShopFilterOptionsCached } from "@/lib/site/shop-filter-options-cache";
import { firstString, parseShopSearchParams } from "@/lib/shop-query";
import { relatedCategoriesForSearchQuery } from "@/lib/search-query";
import { shopCategoryHref } from "@/lib/shop-category-url";
import { ShopFilterSheetProvider } from "@/components/shop/ShopFilterSheetProvider";
import { ShopFilterDesktopSidebar } from "@/components/shop/ShopFilterDesktopSidebar";
import { ShopToolbar } from "@/components/shop/ShopToolbar";
import { ShopCatalogProducts } from "@/components/shop/ShopCatalogProducts";
import { getShopProductsCached } from "@/lib/site/shop-products-cache";
import { reviewSummaryMapFromProducts } from "@/lib/shop-product-reviews";
import type { NextAppPageSearch } from "@/types/next-app";

export const revalidate = 60;

type PageProps = NextAppPageSearch<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = (firstString(sp.q) ?? "").trim();
  const base = { title: "Search | Magenta Crown" };
  if (q.length < 2) {
    return {
      ...base,
      description: "Search luxury occasionwear at Magenta Crown.",
      robots: { index: false, follow: true }
    };
  }
  return {
    title: `${q} | Search | Magenta Crown`,
    description: `Shop results for “${q}” — sarees, lehengas, and curated occasionwear at Magenta Crown.`,
    alternates: { canonical: `/search?q=${encodeURIComponent(q)}` },
    robots: { index: true, follow: true }
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const parsed = parseShopSearchParams(sp);
  const q = (parsed.q ?? "").trim();

  const session = await auth();
  const wishlistPromise = (async () => {
    if (session?.user?.id && !isStorefrontStaff(session.user.role)) {
      const supabase = getSupabaseServiceRoleClient();
      const { data: links, error } = await (supabase.from("_UserWishlist") as any)
        .select("A")
        .eq("B", session.user.id);
      if (error) throw new Error(error.message);
      return new Set(((links ?? []) as Array<{ A: string }>).map((w) => w.A));
    }
    return new Set<string>();
  })();

  const [wishlistIds, filterOptions, shopProducts] = await Promise.all([
    wishlistPromise,
    getShopFilterOptionsCached(),
    getShopProductsCached(sp)
  ]);

  const products = shopProducts.products;
  const { pagination } = shopProducts;
  const total = pagination.total;
  const heading =
    q.length === 0
      ? "Search"
      : total === 0
        ? `0 Results found for “${q}”`
        : `${total.toLocaleString("en-IN")} Results found for “${q}”`;

  const shopBg = "bg-mc-cream";
  const relatedCats =
    q.length > 0 && products.length === 0
      ? relatedCategoriesForSearchQuery(q, filterOptions.categories ?? [])
      : [];

  return (
    <ShopFilterSheetProvider
      options={filterOptions}
      basePath="/search"
      enablePriceSlider
      hideOutOfStockToggle
      preserveQueryKeys={["q"]}
    >
      <main className={`flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden text-mc-ink ${shopBg}`}>
        <div className={`shrink-0 border-b border-mc-ink/10 py-4 ${shopBg}`}>
          <div className="section-shell">
            <div className="rounded-2xl border border-mc-ink/10 bg-mc-cream/90 p-4 shadow-sm ring-1 ring-mc-ink/[0.04] backdrop-blur-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-mc-gold sm:text-xs">Search</p>
                  <h1 className="mt-1 font-mc-heading text-2xl font-semibold text-mc-ink sm:text-3xl">{heading}</h1>
                </div>
                <ShopToolbar basePath="/search" />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`section-shell flex flex-col gap-8 py-6 sm:py-8 lg:flex-row lg:items-start lg:gap-7 lg:py-7 ${shopBg}`}
          data-shop-catalog-body
        >
          <ShopFilterDesktopSidebar
            options={filterOptions}
            basePath="/search"
            enablePriceSlider
            hideOutOfStockToggle
            preserveQueryKeys={["q"]}
          />

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            {products.length === 0 ? (
              <div className="space-y-6">
                {q ? (
                  <p className="text-center text-sm text-mc-ink/80">
                    Results for <span className="font-semibold text-mc-ink">“{q}”</span>
                  </p>
                ) : null}
                <EmptyState
                  title={q ? `No matches for “${q}”` : "Start typing in search"}
                  description={
                    q
                      ? "No exact products found for that phrase. Try another spelling, browse suggested collections below, or clear filters."
                      : "Use the search icon in the header to find products, or browse the full collection."
                  }
                  actionHref="/shop"
                  actionLabel="View all products"
                  secondaryHref="/"
                  secondaryLabel="Back to home"
                />
                {relatedCats.length > 0 ? (
                  <div className="rounded-2xl border border-mc-ink/10 bg-white/80 px-4 py-5 text-left shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mc-ink/60">Suggested collections</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {relatedCats.map((c) => (
                        <li key={c}>
                          <Link
                            href={`${shopCategoryHref(c)}?page=1`}
                            className="inline-flex rounded-full border border-mc-ink/15 bg-mc-cream/90 px-3 py-1.5 text-sm font-medium text-mc-ink transition hover:border-mc-ink/30"
                          >
                            {c}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <ShopCatalogProducts
                basePath="/search"
                urlSearchParams={sp}
                products={products}
                wishlistIds={wishlistIds}
                pagination={pagination}
                reviewSummaryByProductId={reviewSummaryMapFromProducts(products)}
              />
            )}
          </div>
        </div>
      </main>
    </ShopFilterSheetProvider>
  );
}
