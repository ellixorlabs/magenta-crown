"use client";

import Image from "next/image";
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
    <section className="bg-mc-cream py-10 sm:py-14">
      <div className="section-shell">
        <div className="relative">
          <Link
            href={current.targetHref}
            className="group mc-tap block overflow-hidden rounded-3xl border border-mc-ink/10 shadow-[0_20px_50px_-24px_rgba(80,10,30,0.45)] transition hover:shadow-[0_24px_56px_-24px_rgba(80,10,30,0.55)]"
          >
            <div className="grid min-h-[320px] items-end gap-4 bg-gradient-to-br from-mc-maroon via-[#5c0818] to-zinc-950 px-6 py-6 sm:min-h-[400px] sm:grid-cols-[1.05fr_0.95fr] sm:px-10 sm:py-8">
              <div className="max-w-xl text-white">
                <h3 className="font-mc-heading text-2xl font-semibold leading-tight sm:text-3xl">{current.title}</h3>
                {current.subtitle ? (
                  <p className="mt-3 text-sm text-white/85 sm:text-base">{current.subtitle}</p>
                ) : null}
                <span className="mt-6 inline-flex items-center rounded-xl bg-mc-gold px-5 py-2.5 text-sm font-bold text-mc-ink transition group-hover:bg-mc-goldDeep">
                  See more
                </span>
              </div>
              <div className="relative h-[180px] sm:h-[280px]">
                {current.imageUrl ? (
                  <Image
                    src={current.imageUrl}
                    alt={current.title}
                    fill
                    sizes="(max-width: 640px) 70vw, 420px"
                    className="object-contain object-center"
                    loading="lazy"
                    unoptimized
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
                    className={`h-2 rounded-full transition ${i === active ? "w-8 bg-white" : "w-2 bg-white/35"}`}
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

