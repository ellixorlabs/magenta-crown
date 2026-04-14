import Link from "next/link";
import type { Product } from "@prisma/client";
import { ProductCard } from "@/components/features/ProductCard";
import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";
import { getProductTotalStock } from "@/lib/variant-stock";

type ProductRow = Product & { variants?: { quantity: number }[] };

type Props = {
  eyebrow: string;
  title: string;
  products: ProductRow[];
  wishlistIds: Set<string>;
  viewAllHref: string;
  emptyMessage?: string;
};

export function HomeProductGridSection({
  eyebrow,
  title,
  products,
  wishlistIds,
  viewAllHref,
  emptyMessage = "Add products to see them here."
}: Props) {
  return (
    <section className="section-shell py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl">
            {title}
          </h2>
        </div>
        <Link href={viewAllHref} className="text-sm font-medium text-crown-700 underline-offset-4 hover:underline">
          View all
        </Link>
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
              outOfStock={getProductTotalStock(product.variants ?? [], product.stockQuantity) === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}
