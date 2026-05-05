import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/features/ProductCard";
import type { ProductRow } from "@/lib/db/app-types";
import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";
import { getProductTotalStock } from "@/lib/variant-stock";

type HomeProductRow = ProductRow & { variants?: { stock: number; isActive: boolean }[] };

type Props = {
  title: string;
  products: HomeProductRow[];
  wishlistIds: Set<string>;
  viewAllHref: string;
  emptyMessage?: string;
};

export function HomeProductGridSection({
  title,
  products,
  wishlistIds,
  viewAllHref,
  emptyMessage = "Add products to see them here."
}: Props) {
  return (
    <section className="section-shell max-w-full min-w-0 py-10 sm:py-12">
      <div className="mb-5 flex min-w-0 flex-col gap-2 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="mt-0 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl">
            <Link
              href={viewAllHref}
              className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 hover:text-crown-900"
            >
              <span className="min-w-0 break-words">{title}</span>
              <span
                aria-hidden
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            </Link>
          </h2>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
          {emptyMessage}
        </div>
      ) : (
        <div className={PRODUCT_GRID_COMFORT}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              initialWishlisted={wishlistIds.has(product.id)}
              outOfStock={getProductTotalStock(product.variants ?? []) === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}
