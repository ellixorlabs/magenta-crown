"use client";

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { useCallback, useId, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShopFilterSheet } from "@/components/shop/ShopFilterSheetProvider";

const sortOptions = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Alphabetically, A–Z" }
];

function IconList({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={active ? "text-white" : "text-zinc-600"} aria-hidden>
      <rect x="4" y="5" width="16" height="2.25" rx="0.5" fill="currentColor" />
      <rect x="4" y="11" width="16" height="2.25" rx="0.5" fill="currentColor" />
      <rect x="4" y="17" width="16" height="2.25" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function IconCols({ n, active }: { n: 2 | 3 | 4 | 5 | 6; active: boolean }) {
  const gap = 2.2;
  const bar = 2.4;
  const totalW = n * bar + (n - 1) * gap;
  const startX = (24 - totalW) / 2;
  const y1 = 6;
  const h = 12;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={active ? "text-white" : "text-zinc-600"} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <rect
          key={i}
          x={startX + i * (bar + gap)}
          y={y1}
          width={bar}
          height={h}
          rx="0.45"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

type Props = {
  basePath: string;
  isList: boolean;
  cols: 2 | 3 | 4 | 5 | 6 | null;
};

export function ShopToolbar({ basePath, isList, cols }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openFilters } = useShopFilterSheet();
  const sortId = useId();

  const hrefForLayout = useCallback(
    (mode: "list" | "grid", gridCols?: 2 | 3 | 4 | 5 | 6) => {
      const p = new URLSearchParams(searchParams.toString());
      if (mode === "list") {
        p.set("view", "list");
        p.delete("cols");
      } else {
        p.delete("view");
        if (gridCols != null) p.set("cols", String(gridCols));
        else p.delete("cols");
      }
      const q = p.toString();
      return q ? `${basePath}?${q}` : basePath;
    },
    [basePath, searchParams]
  );

  const onFilterClick = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      document.getElementById("shop-sidebar-filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      openFilters();
    }
  }, [openFilters]);

  const sortValue = searchParams.get("sort") ?? "new";

  const densityBtn = (key: string, href: string, active: boolean, label: string, icon: ReactNode) => (
    <Link
      key={key}
      href={href}
      scroll={false}
      className={`flex h-9 w-9 items-center justify-center rounded-md border transition sm:h-10 sm:w-10 ${
        active ? "border-zinc-900 bg-zinc-900 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      }`}
      aria-label={label}
      title={label}
    >
      {icon}
    </Link>
  );

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200/80 pb-5 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-3 lg:gap-4">
      <button
        type="button"
        onClick={onFilterClick}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 sm:justify-start"
      >
        <SlidersHorizontal className="h-4 w-4 text-crown-800" aria-hidden />
        Filter
      </button>

      <div className="flex min-w-0 flex-1 justify-center overflow-x-auto sm:px-1">
        <div className="inline-flex shrink-0 flex-nowrap items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 p-1 shadow-sm">
          {densityBtn("list", hrefForLayout("list"), isList, "List view", <IconList active={isList} />)}
          {densityBtn(
            "c2",
            hrefForLayout("grid", 2),
            !isList && cols === 2,
            "2 columns",
            <IconCols n={2} active={!isList && cols === 2} />
          )}
          {densityBtn(
            "c3",
            hrefForLayout("grid", 3),
            !isList && cols === 3,
            "3 columns",
            <IconCols n={3} active={!isList && cols === 3} />
          )}
          {densityBtn(
            "c4",
            hrefForLayout("grid", 4),
            !isList && cols === 4,
            "4 columns",
            <IconCols n={4} active={!isList && cols === 4} />
          )}
          {densityBtn(
            "c5",
            hrefForLayout("grid", 5),
            !isList && cols === 5,
            "5 columns",
            <IconCols n={5} active={!isList && cols === 5} />
          )}
          {densityBtn(
            "c6",
            hrefForLayout("grid", 6),
            !isList && cols === 6,
            "6 columns",
            <IconCols n={6} active={!isList && cols === 6} />
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col sm:w-auto sm:min-w-[11rem] sm:max-w-[min(100%,18rem)]">
        <label className="sr-only" htmlFor={sortId}>
          Sort products
        </label>
        <select
          id={sortId}
          className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:border-zinc-300 sm:min-w-[11rem]"
          value={sortValue}
          onChange={(e) => {
            const p = new URLSearchParams(searchParams.toString());
            p.set("sort", e.target.value);
            const q = p.toString();
            router.push(q ? `${basePath}?${q}` : basePath, { scroll: false });
          }}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
