"use client";

import Image from "next/image";
import Link from "next/link";
import type { HomeCategoryCircleItem, HomeCategoryCircleShape } from "@/lib/home-page-types";

type Props = {
  eyebrow: string;
  title: string;
  shape: HomeCategoryCircleShape;
  items: HomeCategoryCircleItem[];
};

function resolveHref(item: HomeCategoryCircleItem) {
  if (item.targetType === "category") {
    return `/shop?category=${encodeURIComponent(item.targetValue)}`;
  }
  if (item.targetType === "shopFilter") {
    const q = item.targetValue.replace(/^\?+/, "").trim();
    return q ? `/shop?${q}` : "/shop";
  }
  return item.targetValue || "/shop";
}

export function HomeCategoryCirclesSection({ eyebrow, title, shape, items }: Props) {
  const valid = items.filter((it) => it.label && it.imageUrl && it.targetValue);
  if (valid.length === 0) return null;
  const mediaClass =
    shape === "circle"
      ? "rounded-full"
      : shape === "square"
        ? "rounded-2xl"
        : "rounded-2xl";
  const sizeClass =
    shape === "rectangle"
      ? "h-24 w-24 sm:h-28 sm:w-28"
      : "h-24 w-24 sm:h-28 sm:w-28";

  return (
    <section className="bg-mc-cream py-8 sm:py-11">
      <div className="section-shell">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
          <div className="min-w-0">
            {eyebrow?.trim() ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mc-gold sm:text-[11px]">{eyebrow}</p>
            ) : null}
            <h2 className="font-mc-heading mt-1 text-xl font-semibold text-mc-ink sm:text-2xl">{title}</h2>
          </div>
          <Link
            href="/categories"
            className="shrink-0 text-sm font-bold text-mc-accent transition hover:text-mc-maroon"
          >
            View All
          </Link>
        </div>
        <div className="-mx-1 flex gap-4 overflow-x-auto overflow-y-visible pb-2 pt-1 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-5 lg:grid-cols-6 sm:overflow-visible">
          {valid.map((item) => (
            <Link
              key={item.id}
              href={resolveHref(item)}
              className="group mc-tap w-[5.5rem] shrink-0 text-center sm:w-auto"
            >
              <div
                className={`mx-auto ${sizeClass} overflow-hidden border border-mc-ink/10 bg-white shadow-sm ring-1 ring-white/80 ${mediaClass}`}
              >
                <Image
                  src={item.imageUrl}
                  alt={item.label}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  unoptimized
                />
              </div>
              <p className="mt-2 text-center text-xs font-medium text-mc-ink sm:text-sm">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

