import type { Metadata } from "next";
import { auth } from "@/auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { ProductRow } from "@/lib/db/app-types";
import { EmptyState } from "@/components/empty/EmptyState";
import { getShopFilterOptionsCached } from "@/lib/site/shop-filter-options-cache";
import { getShopProductGridClass } from "@/components/skeletons/shop-grid";
import { parseShopSearchParams } from "@/lib/shop-query";
import { getProductTotalStock } from "@/lib/variant-stock";
import { ShopFilterSheetProvider } from "@/components/shop/ShopFilterSheetProvider";
import { ShopToolbar } from "@/components/shop/ShopToolbar";
import { ProductCard } from "@/components/features/ProductCard";
import { ShopPagination } from "@/components/shop/ShopPagination";
import { getShopProductsCached } from "@/lib/site/shop-products-cache";
import type { NextAppPageSearch } from "@/types/next-app";

/** Keep shop responsive while allowing short-lived cache reuse across quick navigations. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse sarees, lehengas, kurtas, and luxury occasionwear. Filter by category, occasion, size, material, and price at Magenta Crown."
};

type PageProps = NextAppPageSearch<Record<string, string | string[] | undefined>>;

function summarizeReviews(reviews: { rating: number }[]) {
  if (!reviews.length) return null;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { avg: sum / reviews.length, count: reviews.length };
}

export default async function ShopPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const parsed = parseShopSearchParams(sp);
  const isList = parsed.view === "list";
  const gridClass = getShopProductGridClass(parsed.cols);

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

  const [wishlistIds, filterOptions, shopProducts] = await Promise.all([
    wishlistPromise,
    getShopFilterOptionsCached(),
    getShopProductsCached(sp)
  ]);

  const products = shopProducts.products;
  const { pagination } = shopProducts;

  const shopBg = "bg-mc-cream";

  return (
    <ShopFilterSheetProvider
      options={filterOptions}
      basePath="/shop"
      enablePriceSlider
      hideOutOfStockToggle
    >
      <main className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden text-mc-ink ${shopBg}`}>
        <div className={`border-b border-mc-ink/10 py-4 ${shopBg}`}>
          <div className="section-shell">
            <div className="sticky top-[7.5rem] z-20 rounded-2xl border border-mc-ink/10 bg-mc-cream/90 p-4 shadow-sm backdrop-blur-md sm:top-[8rem]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-mc-gold sm:text-xs">Shop</p>
                  <h1 className="mt-1 font-mc-heading text-2xl font-semibold text-mc-ink sm:text-3xl">All products</h1>
                </div>

                <ShopToolbar basePath="/shop" isList={isList} cols={parsed.cols} />
              </div>
            </div>
          </div>
        </div>

        <div className={`section-shell py-8 sm:py-10 ${shopBg}`}>
          <div className="flex min-w-0 flex-col items-stretch gap-10">
            <div className="min-w-0 w-full flex-1">
              {products.length === 0 ? (
                <EmptyState
                  title="No products found"
                  description="Nothing matches these filters right now. Clear filters or browse the full collection."
                  actionHref="/shop"
                  actionLabel="View all products"
                  secondaryHref="/"
                  secondaryLabel="Back to home"
                />
              ) : (
                <>
                  <ShopPagination
                    basePath="/shop"
                    searchParams={sp}
                    page={pagination.page}
                    pageSize={pagination.pageSize}
                    totalCount={pagination.total}
                  />

                  {isList ? (
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                      {products.map((p) => {
                        const { reviews, ...product } = p;
                        return (
                          <ProductCard
                            key={product.id}
                        product={product as unknown as ProductRow}
                            layout="list"
                            listDensity="comfortable"
                            initialWishlisted={wishlistIds.has(product.id)}
                            outOfStock={getProductTotalStock(p.variants) === 0}
                            reviewSummary={summarizeReviews(reviews)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className={gridClass}>
                      {products.map((p) => {
                        const { reviews, ...product } = p;
                        return (
                          <ProductCard
                            key={product.id}
                        product={product as unknown as ProductRow}
                            initialWishlisted={wishlistIds.has(product.id)}
                            outOfStock={getProductTotalStock(p.variants) === 0}
                            reviewSummary={summarizeReviews(reviews)}
                          />
                        );
                      })}
                    </div>
                  )}

                  <ShopPagination
                    basePath="/shop"
                    searchParams={sp}
                    page={pagination.page}
                    pageSize={pagination.pageSize}
                    totalCount={pagination.total}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </ShopFilterSheetProvider>
  );
}
