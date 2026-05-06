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
  imageUrlMobile?: string;
  imageUrlDesktop?: string;
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
  const mobileImage = current.imageUrlMobile || current.imageUrl || "";
  const desktopImage = current.imageUrlDesktop || current.imageUrl || mobileImage;

  return (
    <section className="bg-mc-cream py-10 sm:py-14">
      <div className="section-shell">
        <div className="relative">
          <Link
            href={current.targetHref}
            className="group mc-tap block overflow-hidden rounded-3xl border border-mc-ink/10 shadow-[0_20px_50px_-24px_rgba(80,10,30,0.45)] transition hover:shadow-[0_24px_56px_-24px_rgba(80,10,30,0.55)]"
          >
            <div className="relative min-h-[68svh] sm:min-h-[460px]">
              <div className="relative h-[68svh] sm:hidden">
                {mobileImage ? (
                  <Image
                    src={mobileImage}
                    alt={current.title}
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                    loading="lazy"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="relative hidden h-[460px] sm:block">
                {desktopImage ? (
                  <Image
                    src={desktopImage}
                    alt={current.title}
                    fill
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    className="object-cover object-center"
                    loading="lazy"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent sm:h-36" />
              <div className="absolute inset-x-0 bottom-0 z-[1] p-4 text-white sm:p-6">
                <h3 className="font-mc-heading text-xl font-semibold leading-tight sm:text-3xl">{current.title}</h3>
                {current.subtitle ? <p className="mt-2 text-sm text-white/85 sm:text-base">{current.subtitle}</p> : null}
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

