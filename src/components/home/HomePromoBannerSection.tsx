"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetHref: string;
};

export function HomePromoBannerSection({ title, subtitle, imageUrl, targetHref }: Props) {
  return (
    <section className="bg-white py-14 sm:py-16 lg:py-12 xl:py-14">
      <div className="section-shell">
        <Link
          href={targetHref}
          className="group block overflow-hidden rounded-[28px] border border-white/40 shadow-[0_14px_42px_-20px_rgba(120,12,48,0.55)] transition hover:shadow-[0_18px_48px_-20px_rgba(120,12,48,0.65)]"
        >
          <div className="grid min-h-[450px] items-end gap-4 bg-white px-6 py-6 sm:grid-cols-[1.05fr_0.95fr] sm:px-10 sm:py-8">
            <div className="max-w-xl text-[#4a1030]">
              <h3 className="font-[family-name:var(--font-heading)] text-3xl font-semibold leading-tight sm:text-4xl">
                {title}
              </h3>
              {subtitle ? <p className="mt-3 text-sm text-[#5f2641]/90 sm:text-base">{subtitle}</p> : null}
              <span className="mt-6 inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#7f1530] transition group-hover:bg-white/90">
                See more
              </span>
            </div>
            <div className="relative h-[180px] sm:h-[280px]">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  sizes="(max-width: 640px) 70vw, 420px"
                  quality={75}
                  className="object-contain object-center"
                  loading="lazy"
                />
              ) : null}
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
