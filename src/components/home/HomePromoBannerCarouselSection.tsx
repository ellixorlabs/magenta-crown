"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

type BannerItem = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetHref: string;
};

type Props = {
  banners: BannerItem[];
};

export function HomePromoBannerCarouselSection({ banners }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((cur) => (cur + 1) % banners.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const current = banners[Math.min(active, banners.length - 1)]!;

  return (
    <section className="bg-[#faf7f8] py-14 sm:py-16">
      <div className="section-shell">
        <div className="relative">
          <Link
            href={current.targetHref}
            className="group block overflow-hidden rounded-[28px] border border-white/40 shadow-[0_14px_42px_-20px_rgba(120,12,48,0.55)] transition hover:shadow-[0_18px_48px_-20px_rgba(120,12,48,0.65)]"
          >
            <div className="grid min-h-[450px] items-end gap-4 bg-[#f3e4ea] px-6 py-6 sm:grid-cols-[1.05fr_0.95fr] sm:px-10 sm:py-8">
              <div className="max-w-xl text-[#4a1030]">
                <h3 className="font-[family-name:var(--font-heading)] text-3xl font-semibold leading-tight sm:text-4xl">
                  {current.title}
                </h3>
                {current.subtitle ? <p className="mt-3 text-sm text-[#5f2641]/90 sm:text-base">{current.subtitle}</p> : null}
                <span className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#7f1530] transition group-hover:bg-white/90">
                  See more
                </span>
              </div>
              <div className="relative h-[180px] sm:h-[280px]">
                {current.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin runtime URLs
                  <img
                    src={current.imageUrl}
                    alt={current.title}
                    className="absolute inset-0 h-full w-full object-contain object-center"
                    loading="lazy"
                  />
                ) : null}
              </div>
            </div>
          </Link>

          {banners.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous promo"
                onClick={() => setActive((cur) => (cur - 1 + banners.length) % banners.length)}
                className="absolute left-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-700 shadow-md transition hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next promo"
                onClick={() => setActive((cur) => (cur + 1) % banners.length)}
                className="absolute right-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-700 shadow-md transition hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="mt-4 flex justify-center gap-2">
                {banners.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Go to promo ${i + 1}`}
                    className={`h-2 rounded-full transition ${i === active ? "w-8 bg-crown-700" : "w-2 bg-zinc-300"}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

