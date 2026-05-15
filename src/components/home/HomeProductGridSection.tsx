import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/features/ProductCard";
import type { ProductRow } from "@/lib/db/app-types";
import { PRODUCT_GRID_COMFORT, PRODUCT_GRID_HOME_LUXURY } from "@/lib/product-grid-classes";
import { getProductTotalStock } from "@/lib/variant-stock";

type HomeProductRow = ProductRow & { variants?: { stock: number; isActive: boolean }[] };

type Props = {
  title: string;
  products: HomeProductRow[];
  wishlistIds: Set<string>;
  viewAllHref: string;
  emptyMessage?: string;
  cardDensity?: "default" | "compact";
};

export function HomeProductGridSection({
  title,
  products,
  wishlistIds,
  viewAllHref,
  emptyMessage = "Add products to see them here.",
  cardDensity = "default"
}: Props) {
  const gridClass = cardDensity === "compact" ? PRODUCT_GRID_HOME_LUXURY : PRODUCT_GRID_COMFORT;
  return (
    <section className="section-shell max-w-full min-w-0 bg-mc-cream py-8 sm:py-11 lg:py-10">
      <div className="mb-5 flex min-w-0 flex-col gap-2 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4 lg:mb-5">
        <div className="min-w-0">
          <h2 className="mt-0 font-mc-heading text-xl font-semibold text-mc-ink sm:text-2xl">
            <Link
              href={viewAllHref}
              className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 transition hover:text-mc-maroon"
            >
              <span className="min-w-0 break-words">{title}</span>
              <span
                aria-hidden
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-mc-ink/15 bg-white text-mc-ink/60"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            </Link>
          </h2>
        </div>
        <Link href={viewAllHref} className="shrink-0 text-sm font-bold text-mc-accent transition hover:text-mc-maroon sm:hidden">
          View All
        </Link>
      </div>
      {products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-mc-ink/20 bg-mc-creamDeep/80 p-10 text-center text-mc-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className={gridClass}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              initialWishlisted={wishlistIds.has(product.id)}
              outOfStock={getProductTotalStock(product.variants ?? []) === 0}
              cardDensity={cardDensity}
            />
          ))}
        </div>
      )}
    </section>
  );
}
