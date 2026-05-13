import { auth } from "@/auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { EmptyState } from "@/components/empty/EmptyState";
import type { ShopFilterOptions } from "@/lib/shop-filter-shared";
import { ShopFilterSheetProvider } from "@/components/shop/ShopFilterSheetProvider";
import { ShopFilterDesktopSidebar } from "@/components/shop/ShopFilterDesktopSidebar";
import { ShopToolbar } from "@/components/shop/ShopToolbar";
import { ShopCatalogProducts } from "@/components/shop/ShopCatalogProducts";
import { getShopProductsCached } from "@/lib/site/shop-products-cache";
import { reviewSummaryMapFromProducts } from "@/lib/shop-product-reviews";

export type ShopPathFilterLock = {
  omitUrlFilterKeys: readonly string[];
  hideCategoryFilter?: boolean;
  hideFacetFields?: readonly ("style" | "occasion" | "material")[];
};

type Props = {
  filterOptions: ShopFilterOptions;
  /** Flat params merged from path + query (server fetch). */
  mergedSearchParams: Record<string, string | string[] | undefined>;
  /** Params reflected in visible URLs (omit path-backed keys). */
  urlSearchParams: Record<string, string | string[] | undefined>;
  basePath: string;
  heading: string;
  emptyResetHref: string;
  emptyPrimaryLabel?: string;
  pathLock?: ShopPathFilterLock;
};

export async function ShopCatalogMain({
  filterOptions,
  mergedSearchParams,
  urlSearchParams,
  basePath,
  heading,
  emptyResetHref,
  emptyPrimaryLabel = "View all products",
  pathLock
}: Props) {
  const session = await auth();
  const wishlistPromise = (async () => {
    if (
      session?.user?.id &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SUB_ADMIN" &&
      session.user.role !== "TECH_SUPPORT"
    ) {
      const supabase = getSupabaseServiceRoleClient();
      const { data: links, error } = await (supabase.from("_UserWishlist") as any)
        .select("A")
        .eq("B", session.user.id);
      if (error) throw new Error(error.message);
      return new Set(((links ?? []) as Array<{ A: string }>).map((w) => w.A));
    }
    return new Set<string>();
  })();

  const [wishlistIds, shopProducts] = await Promise.all([wishlistPromise, getShopProductsCached(mergedSearchParams)]);

  const products = shopProducts.products;
  const { pagination } = shopProducts;
  const shopBg = "bg-mc-cream";

  const lock = pathLock ?? {
    omitUrlFilterKeys: [] as const,
    hideCategoryFilter: false,
    hideFacetFields: [] as const
  };

  return (
    <ShopFilterSheetProvider
      options={filterOptions}
      basePath={basePath}
      enablePriceSlider
      hideOutOfStockToggle
      omitUrlFilterKeys={lock.omitUrlFilterKeys}
      hideCategoryFilter={lock.hideCategoryFilter}
      hideFacetFields={lock.hideFacetFields}
    >
      <main className={`flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden text-mc-ink ${shopBg}`}>
        <div className={`shrink-0 border-b border-mc-ink/10 py-4 ${shopBg}`}>
          <div className="section-shell">
            <div className="rounded-2xl border border-mc-ink/10 bg-mc-cream/90 p-4 shadow-sm ring-1 ring-mc-ink/[0.04] backdrop-blur-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-mc-gold sm:text-xs">Shop</p>
                  <h1 className="mt-1 font-mc-heading text-2xl font-semibold text-mc-ink sm:text-3xl">{heading}</h1>
                </div>

                <ShopToolbar basePath={basePath} />
              </div>
            </div>
          </div>
        </div>

        <div className={`section-shell flex flex-col gap-8 py-6 sm:py-8 lg:flex-row lg:items-start ${shopBg}`}>
          <ShopFilterDesktopSidebar
            options={filterOptions}
            basePath={basePath}
            enablePriceSlider
            hideOutOfStockToggle
            omitUrlFilterKeys={lock.omitUrlFilterKeys}
            hideCategoryFilter={lock.hideCategoryFilter}
            hideFacetFields={lock.hideFacetFields}
          />

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            {products.length === 0 ? (
              <EmptyState
                title="No products found"
                description="Nothing matches these filters right now. Clear filters or browse the full collection."
                actionHref={emptyResetHref}
                actionLabel={emptyPrimaryLabel}
                secondaryHref="/shop"
                secondaryLabel="Shop home"
              />
            ) : (
              <ShopCatalogProducts
                basePath={basePath}
                urlSearchParams={urlSearchParams}
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
