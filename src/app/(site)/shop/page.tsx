import type { Metadata } from "next";
import type { Product } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

/** Avoid stale RSC/HTML on localhost — external browsers often cache /shop harder than embedded dev browsers. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse sarees, lehengas, kurtas, and luxury occasionwear. Filter by category, occasion, size, material, and price at Magenta Crown."
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { wishlist: { select: { id: true } } }
      });
      return new Set(u?.wishlist.map((w) => w.id) ?? []);
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

  /** Solid shell tone — avoids half-white / half-blush from body gradients under this page only. */
  const shopBg = "bg-[#f4f0f2]";

  return (
    <ShopFilterSheetProvider
      options={filterOptions}
      basePath="/shop"
      enablePriceSlider
      hideOutOfStockToggle
    >
      <main className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden text-zinc-900 ${shopBg}`}>
        <div className={`border-b border-zinc-300/35 py-7 ${shopBg}`}>
          <div className="section-shell">
            <div className="rounded-2xl border border-zinc-300/60 bg-[#faf6f7]/98 p-5 shadow-sm backdrop-blur-[2px] sticky top-[7.5rem] sm:top-[8rem] z-20">
              <div className="flex flex-col gap-5">
                <div className="min-w-0 lg:max-w-xl">
                  <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Shop</p>
                  <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold sm:text-4xl">
                    All products
                  </h1>
                  <p className="mt-2 text-sm text-zinc-600">
                    Filter the collection, pick sort order, and switch between list view and 2–6 column grids.
                  </p>
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
                        product={product as unknown as Product}
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
                        product={product as unknown as Product}
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
