"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useCallback, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShopFilterSheet } from "@/components/shop/ShopFilterSheetProvider";

const sortOptions = [
  { value: "new", label: "New Arrivals" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Alphabetically, A–Z" }
];

const controlClass =
  "min-h-11 rounded-xl border border-mc-ink/15 bg-white text-sm font-semibold text-mc-ink shadow-sm transition hover:border-mc-ink/25 hover:bg-zinc-50/90 active:scale-[0.99]";

type Props = {
  basePath: string;
};

export function ShopToolbar({ basePath }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isFiltersOpen, toggleFilters } = useShopFilterSheet();
  const sortId = useId();

  const onFilterClick = useCallback(() => {
    toggleFilters();
  }, [toggleFilters]);

  const rawSort = searchParams.get("sort") ?? "new";
  const sortValue = rawSort === "price_desc" ? "price-desc" : rawSort === "price_asc" ? "price-asc" : rawSort;

  return (
    <div
      className="flex w-full min-w-0 flex-row items-stretch gap-2 sm:w-auto sm:min-w-[min(100%,20rem)]"
      role="toolbar"
      aria-label="Shop filters and sort"
    >
      <button
        type="button"
        onClick={onFilterClick}
        aria-expanded={isFiltersOpen}
        aria-controls="shop-filters-sheet"
        className={`${controlClass} inline-flex flex-1 items-center justify-center gap-1.5 px-3 sm:flex-initial sm:px-4`}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-mc-maroon" aria-hidden />
        <span>Filters</span>
      </button>

      <div className="relative min-w-0 flex-[1.2] sm:flex-initial sm:min-w-[10.5rem]">
        <label className="sr-only" htmlFor={sortId}>
          Sort products
        </label>
        <select
          id={sortId}
          className={`${controlClass} w-full cursor-pointer appearance-none truncate py-2 pl-3 pr-9`}
          value={sortValue}
          onChange={(e) => {
            const p = new URLSearchParams(searchParams.toString());
            p.set("sort", e.target.value);
            p.set("page", "1");
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
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mc-ink/45"
          aria-hidden
        />
      </div>
    </div>
  );
}
