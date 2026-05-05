"use client";

import Link from "next/link";
import type { ProductRow } from "@/lib/db/app-types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/features/ProductCard";
import { getProductTotalStock } from "@/lib/variant-stock";

type HomeProductRow = ProductRow & { variants?: { stock: number; isActive: boolean }[] };

type Props = {
  title: string;
  products: HomeProductRow[];
  wishlistIds: Set<string>;
  viewAllHref: string;
  emptyMessage?: string;
};

export function HomeProductCarouselSection({
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
    <section className="overflow-x-clip bg-[#faf7f8] py-10 sm:py-12">
      <div className="section-shell max-w-full min-w-0">
        <div className="mb-5 ml-[70px] flex w-[1000px] min-w-0 flex-col gap-2 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
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
                    className="w-[min(260px,100%)] max-w-full shrink-0 snap-start sm:w-[min(280px,38vw)] lg:w-[min(260px,calc((100%-6rem)/5))]"
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

          </>
        )}
      </div>
    </section>
  );
}
