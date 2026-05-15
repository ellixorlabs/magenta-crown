"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { HomePageBannerDisplay } from "@/lib/home-page-banner";

type Props = {
  banners: HomePageBannerDisplay[];
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
  const mobileImage = current.mobileImage || current.desktopImage;
  const desktopImage = current.desktopImage || current.mobileImage;
  const first = active === 0;

  return (
    <section className="bg-mc-cream py-10 sm:py-14 lg:py-12">
      <div className="section-shell">
        <div className="relative">
          <Link
            href={current.redirectUrl}
            className="group mc-tap block overflow-hidden rounded-3xl border border-mc-ink/10 shadow-[0_20px_50px_-24px_rgba(80,10,30,0.45)] transition hover:shadow-[0_24px_56px_-24px_rgba(80,10,30,0.55)]"
          >
            <div className="relative min-h-[68svh] w-full min-w-0 sm:min-h-[460px]">
              <div className="relative h-[68svh] w-full min-w-0 sm:h-[460px]">
                <div className="absolute inset-0 min-h-0 lg:hidden">
                  {mobileImage ? (
                    <div className="relative h-full w-full min-h-0">
                      <Image
                        src={mobileImage}
                        alt={current.title}
                        fill
                        priority={first}
                        sizes="(max-width: 1023px) 100vw, 768px"
                        className="object-cover object-center transition duration-500 group-hover:scale-[1.02]"
                        loading={first ? "eager" : "lazy"}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="absolute inset-0 hidden min-h-0 lg:block">
                  {desktopImage ? (
                    <div className="relative h-full w-full min-h-0">
                      <Image
                        src={desktopImage}
                        alt={current.title}
                        fill
                        priority={first}
                        sizes="(min-width: 1024px) min(96vw, 1920px), 0px"
                        className="object-cover object-center transition duration-500 group-hover:scale-[1.02]"
                        loading={first ? "eager" : "lazy"}
                      />
                    </div>
                  ) : null}
                </div>
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
