"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoryItem } from "@/lib/home-page-types";
import { occasionCardHref } from "@/lib/occasion-card-href";

type Props = {
  sectionId: string;
  eyebrow: string;
  title: string;
  items: CategoryItem[];
};

export function OccasionSection({ sectionId, eyebrow, title, items }: Props) {
  const headingId = `occasion-section-title-${sectionId}`;
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
  }, [items.length, updateArrows]);

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-occasion-card]");
    const w = card?.offsetWidth ?? el.clientWidth * 0.85;
    const gap = 20;
    el.scrollBy({ left: dir * (w + gap), behavior: "smooth" });
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="section-shell py-16" aria-labelledby={headingId}>
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
          <h2
            id={headingId}
            className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl"
          >
            {title}
          </h2>
        </div>
      </div>

      <div className="flex items-stretch gap-2 sm:gap-4">
        <div className="flex w-10 shrink-0 flex-col items-center justify-center self-stretch sm:w-12">
          {canPrev ? (
            <motion.button
              type="button"
              aria-label="Previous occasions"
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
          className="touch-pan-x flex min-w-0 flex-1 snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((category) => (
            <Link
              key={category.title + category.href + (category.occasion ?? "")}
              data-occasion-card
              href={occasionCardHref(category)}
              className="group relative block h-[380px] w-[min(320px,calc(100vw-7.5rem))] shrink-0 snap-start overflow-hidden rounded-3xl border border-zinc-200 sm:w-[min(340px,calc(50vw-4rem))] lg:w-[min(360px,32vw)]"
            >
              <Image
                src={category.imageUrl}
                alt={category.title}
                fill
                className="object-cover transition duration-700 group-hover:scale-110"
                sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 360px"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 p-6 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-white/70">Explore</p>
                <h3 className="text-2xl font-medium">{category.title}</h3>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex w-10 shrink-0 flex-col items-center justify-center self-stretch sm:w-12">
          {canNext ? (
            <motion.button
              type="button"
              aria-label="Next occasions"
              whileTap={{ scale: 0.94 }}
              onClick={() => scrollByDir(1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-700 shadow-md transition hover:bg-zinc-50 sm:h-12 sm:w-12"
            >
              <ChevronRight className="h-6 w-6" strokeWidth={1.75} />
            </motion.button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
