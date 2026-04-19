import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/empty/EmptyState";
import { getShopFilterOptions } from "@/lib/shop-filter-options";
import { getShopProductGridClass } from "@/components/skeletons/shop-grid";
import { buildProductOrderBy, buildProductWhere, parseShopSearchParams } from "@/lib/shop-query";
import { getProductTotalStock } from "@/lib/variant-stock";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ShopFilterSheetProvider } from "@/components/shop/ShopFilterSheetProvider";
import { ShopToolbar } from "@/components/shop/ShopToolbar";
import { ProductCard } from "@/components/features/ProductCard";

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
  const where = buildProductWhere(sp);
  const parsed = parseShopSearchParams(sp);
  const { sort } = parsed;
  const orderBy = buildProductOrderBy(sort);
  const isList = parsed.view === "list";
  const gridClass = getShopProductGridClass(parsed.cols);

  const session = await auth();
  let wishlistIds = new Set<string>();
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
    wishlistIds = new Set(u?.wishlist.map((w) => w.id) ?? []);
  }

  const [filterOptions, products] = await Promise.all([
    getShopFilterOptions(),
    prisma.product.findMany({
      where,
      orderBy,
      include: {
        variants: { select: { stock: true, isActive: true } },
        reviews: { select: { rating: true } }
      }
    })
  ]);

  /** Solid shell tone — avoids half-white / half-blush from body gradients under this page only. */
  const shopBg = "bg-[#f4f0f2]";

  return (
    <main className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden text-zinc-900 ${shopBg}`}>
      <div className={`border-b border-zinc-300/35 py-8 ${shopBg}`}>
        <div className="section-shell text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Shop</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold sm:text-4xl">
            All products
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-600">
            Filter the collection, pick sort order, and switch between list view and 2–6 column grids.
          </p>
        </div>
      </div>

      <div className={`section-shell py-8 sm:py-10 ${shopBg}`}>
        <div className="flex min-w-0 flex-col items-stretch gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-14">
          <aside className="sticky top-[8.75rem] z-10 hidden w-full max-w-[300px] shrink-0 self-start sm:top-[9.25rem] lg:block lg:min-w-[260px]">
            <div
              id="shop-sidebar-filters"
              className="rounded-2xl border border-zinc-300/60 bg-[#faf6f7]/98 p-5 shadow-sm scroll-mt-28 backdrop-blur-[2px]"
            >
              <Suspense fallback={<div className="p-4 text-sm text-zinc-500">Loading filters…</div>}>
                <ShopFilters
                  options={filterOptions}
                  basePath="/shop"
                  enablePriceSlider
                  hideOutOfStockToggle
                  omitSort
                />
              </Suspense>
            </div>
          </aside>

          <ShopFilterSheetProvider
            options={filterOptions}
            basePath="/shop"
            enablePriceSlider
            hideOutOfStockToggle
          >
            <div className="min-w-0 w-full flex-1">
              <ShopToolbar basePath="/shop" isList={isList} cols={parsed.cols} />

              {products.length === 0 ? (
                <EmptyState
                  title="No products found"
                  description="Nothing matches these filters right now. Clear filters or browse the full collection."
                  actionHref="/shop"
                  actionLabel="View all products"
                  secondaryHref="/"
                  secondaryLabel="Back to home"
                />
              ) : isList ? (
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                  {products.map((p) => {
                    const { reviews, ...product } = p;
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
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
                        product={product}
                        initialWishlisted={wishlistIds.has(product.id)}
                        outOfStock={getProductTotalStock(p.variants) === 0}
                        reviewSummary={summarizeReviews(reviews)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </ShopFilterSheetProvider>
        </div>
      </div>
    </main>
  );
}
