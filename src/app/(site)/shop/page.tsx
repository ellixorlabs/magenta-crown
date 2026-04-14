import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getShopFilterOptions } from "@/lib/shop-filter-options";
import { buildProductOrderBy, buildProductWhere, parseShopSearchParams } from "@/lib/shop-query";
import { getProductTotalStock } from "@/lib/variant-stock";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ShopViewToggle } from "@/components/shop/ShopViewToggle";
import { ProductCard } from "@/components/features/ProductCard";

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
        variants: { select: { quantity: true } },
        reviews: { select: { rating: true } }
      }
    })
  ]);

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden text-zinc-900">
      <div className="border-b border-zinc-200/60 bg-white/40 py-8 backdrop-blur-sm">
        <div className="section-shell text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Shop</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold sm:text-4xl">
            All products
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-600">
            Filters and collection use the full width below—spacious grid, larger cards. Switch list or grid anytime.
          </p>
        </div>
      </div>

      <div className="section-shell py-8 sm:py-10">
        <div className="flex min-w-0 flex-col items-stretch gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-14">
          <aside className="sticky top-[8.75rem] z-10 hidden w-full max-w-[300px] shrink-0 self-start sm:top-[9.25rem] lg:block lg:min-w-[260px]">
            <div className="rounded-2xl border border-zinc-200/90 bg-white/95 p-5 shadow-sm">
              <Suspense fallback={<div className="p-4 text-sm text-zinc-500">Loading filters…</div>}>
                <ShopFilters options={filterOptions} basePath="/shop" enablePriceSlider showOutOfStockToggle />
              </Suspense>
            </div>
          </aside>

          <div className="min-w-0 w-full flex-1">
            <div className="mb-6 lg:hidden">
              <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200/90 bg-white/95 p-4 shadow-sm">
                <Suspense fallback={null}>
                  <ShopFilters options={filterOptions} basePath="/shop" enablePriceSlider showOutOfStockToggle />
                </Suspense>
              </div>
            </div>

            <div className="mb-4 flex justify-center">
              <Suspense fallback={null}>
                <ShopViewToggle />
              </Suspense>
            </div>

            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/80 p-12 text-center text-zinc-500">
                No products match these filters. Try adjusting or{" "}
                <a href="/shop" className="text-crown-800 underline">
                  clear filters
                </a>
                .
              </div>
            ) : isList ? (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                {products.map((p) => {
                  const { reviews, ...product } = p;
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      layout="list"
                      initialWishlisted={wishlistIds.has(product.id)}
                      outOfStock={getProductTotalStock(p.variants, p.stockQuantity) === 0}
                      reviewSummary={summarizeReviews(reviews)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-7 xl:grid-cols-5 xl:gap-8">
                {products.map((p) => {
                  const { reviews, ...product } = p;
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      initialWishlisted={wishlistIds.has(product.id)}
                      outOfStock={getProductTotalStock(p.variants, p.stockQuantity) === 0}
                      reviewSummary={summarizeReviews(reviews)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
