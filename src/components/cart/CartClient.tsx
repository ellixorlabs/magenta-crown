"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import type { Product } from "@prisma/client";
import { EmptyState } from "@/components/empty/EmptyState";
import { BagPromoAppliedRow, BagPromoSection } from "@/components/cart/BagPromoSection";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/features/ProductCard";
import { getProductTotalStock } from "@/lib/variant-stock";

type Props = {
  upsells: (Product & { variants?: { stock: number; isActive: boolean }[] })[];
};

export function CartClient({ upsells }: Props) {
  const { items, subtotal, discountedTotal, updateQuantity, removeItem } = useCart();
  const cartProductIds = useMemo(() => [...new Set(items.map((i) => i.productId))], [items]);

  return (
    <main className="min-h-screen bg-[#f8f5f6] py-10">
      <div className="section-shell">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">Your bag</h1>

        {items.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="Your bag is empty"
              description="Browse the collection and add pieces you love. Your selections stay here while you shop."
              actionHref="/shop"
              actionLabel="Shop collection"
              secondaryHref="/"
              secondaryLabel="Back to home"
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
            <ul className="space-y-4">
              {items.map((line) => {
                const img =
                  line.imageUrl ??
                  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=200&q=80";
                const productHref = line.slug ? `/product/${line.slug}` : null;
                return (
                  <li key={line.lineKey} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
                    {productHref ? (
                      <Link href={productHref} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                        <Image
                          src={img}
                          alt={line.name}
                          fill
                          className="object-contain"
                          sizes="96px"
                          loading="lazy"
                          unoptimized
                        />
                      </Link>
                    ) : (
                      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                        <Image
                          src={img}
                          alt={line.name}
                          fill
                          className="object-contain"
                          sizes="96px"
                          loading="lazy"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {productHref ? (
                        <Link href={productHref} className="font-medium text-zinc-900 underline-offset-2 hover:underline">
                          {line.name}
                        </Link>
                      ) : (
                        <p className="font-medium text-zinc-900">{line.name}</p>
                      )}
                      {(line.size || line.color) && (
                        <p className="text-xs text-zinc-500">
                          {line.size && `Size ${line.size}`}
                          {line.size && line.color ? " · " : ""}
                          {line.color && `Color ${line.color}`}
                        </p>
                      )}
                      <p className="mt-1 text-base font-semibold text-crown-800">Rs {line.price}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-zinc-500">Qty</label>
                        <input
                          type="number"
                          min={1}
                          max={line.maxStock ?? undefined}
                          className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm"
                          value={line.quantity}
                          onChange={(e) => updateQuantity(line.lineKey, Number(e.target.value))}
                        />
                        <button
                          type="button"
                          className="text-xs text-red-600 underline"
                          onClick={() => removeItem(line.lineKey)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-zinc-900">
                      Rs {(line.price * line.quantity).toFixed(0)}
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Summary</h2>
                <div className="mt-4 flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900">Rs {subtotal.toFixed(0)}</span>
                </div>
                <BagPromoAppliedRow />
                <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4 text-lg font-semibold">
                  <span>Total</span>
                  <span>Rs {discountedTotal.toFixed(0)}</span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Delivery estimate: 5–7 business days within India (mock).
                </p>
                <BagPromoSection productIds={cartProductIds} />
                <Link
                  href="/checkout"
                  className="mt-6 block w-full rounded-full bg-crown-800 py-3 text-center text-sm font-semibold text-white hover:bg-crown-900"
                >
                  Checkout
                </Link>
              </div>

              {upsells.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">You may also like</h3>
                  <div className="mt-4 grid gap-4">
                    {upsells.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        outOfStock={getProductTotalStock(p.variants ?? []) === 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
