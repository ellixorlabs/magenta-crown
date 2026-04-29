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
      ? "h-20 w-[7.5rem] sm:h-24 sm:w-[9rem]"
      : "h-20 w-20 sm:h-24 sm:w-24";

  return (
    <section className="bg-[#faf7f8] py-10 sm:py-12">
      <div className="section-shell">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl">
          {title}
        </h2>
        <div className="mt-7 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {valid.map((item) => (
            <Link key={item.id} href={resolveHref(item)} className="group text-center">
              <div className={`mx-auto ${sizeClass} overflow-hidden border border-zinc-200 bg-white shadow-sm ${mediaClass}`}>
                <Image
                  src={item.imageUrl}
                  alt={item.label}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  unoptimized
                />
              </div>
              <p className="mt-2 text-sm font-medium text-zinc-800">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

