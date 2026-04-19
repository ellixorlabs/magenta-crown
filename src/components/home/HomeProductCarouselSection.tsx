"use client";

import Link from "next/link";
import type { Product } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/features/ProductCard";
import { getProductTotalStock } from "@/lib/variant-stock";

type ProductRow = Product & { variants?: { stock: number; isActive: boolean }[] };

type Props = {
  eyebrow: string;
  title: string;
  products: ProductRow[];
  wishlistIds: Set<string>;
  viewAllHref: string;
  emptyMessage?: string;
};

export function HomeProductCarouselSection({
  eyebrow,
  title,
  products,
  wishlistIds,
  viewAllHref,
  emptyMessage = "Add sarees to see them here."
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    return () => ro.disconnect();
  }, [products.length, updateArrows]);

  const scrollByDir = useCallback(
    (dir: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;
      const delta = Math.min(el.clientWidth * 0.72, 420) * dir;
      el.scrollBy({ left: delta, behavior: "smooth" });
    },
    []
  );

  return (
    <section className="bg-[#faf7f8] py-14 sm:py-16">
      <div className="section-shell">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl">
              {title}
            </h2>
          </div>
          {products.length > 0 ? (
            <Link
              href={viewAllHref}
              className="text-sm font-medium text-crown-700 underline-offset-4 hover:underline"
            >
              View all
            </Link>
          ) : null}
        </div>

        {products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
            {emptyMessage}
          </div>
        ) : (
          <>
            {/*
              Side columns keep nav off the product imagery. Buttons only mount when that direction
              can scroll — no disabled overlay stealing clicks from cards.
            */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex w-10 shrink-0 flex-col items-center justify-center self-stretch sm:w-12">
                {canPrev ? (
                  <motion.button
                    type="button"
                    aria-label="Previous products"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => scrollByDir(-1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-700 shadow-md transition hover:bg-zinc-50 sm:h-12 sm:w-12"
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={1.75} />
                  </motion.button>
                ) : null}
              </div>

              <div
                ref={scrollerRef}
                onScroll={updateArrows}
                className="flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="w-[min(260px,calc(100vw-8rem))] shrink-0 snap-start sm:w-[min(280px,38vw)] lg:w-[min(260px,calc((100%-6rem)/5))]"
                  >
                    <ProductCard
                      product={product}
                      initialWishlisted={wishlistIds.has(product.id)}
                      outOfStock={getProductTotalStock(product.variants ?? []) === 0}
                      layout="carousel"
                    />
                  </div>
                ))}
              </div>

              <div className="flex w-10 shrink-0 flex-col items-center justify-center self-stretch sm:w-12">
                {canNext ? (
                  <motion.button
                    type="button"
                    aria-label="Next products"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => scrollByDir(1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-700 shadow-md transition hover:bg-zinc-50 sm:h-12 sm:w-12"
                  >
                    <ChevronRight className="h-6 w-6" strokeWidth={1.75} />
                  </motion.button>
                ) : null}
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={viewAllHref}
                  className="inline-flex min-w-[min(100%,22rem)] items-center justify-center rounded-xl bg-crown-600 px-10 py-3.5 text-center text-sm font-bold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-crown-700"
                >
                  See more
                </Link>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
