"use client";

import { SlidersHorizontal } from "lucide-react";
import { useCallback, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShopFilterSheet } from "@/components/shop/ShopFilterSheetProvider";

const sortOptions = [
  { value: "new", label: "New Arrivals" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Alphabetically, A–Z" }
];

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
    <div className="flex w-full flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:self-end">
      <button
        type="button"
        onClick={onFilterClick}
        aria-expanded={isFiltersOpen}
        className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-full border border-mc-ink/20 bg-white px-5 py-2 text-sm font-semibold text-mc-ink shadow-sm transition hover:bg-zinc-50 sm:flex-initial"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Filter & Sort
      </button>

      <div className="flex w-full shrink-0 flex-col sm:w-auto sm:min-w-[11rem] sm:max-w-[min(100%,18rem)]">
        <label className="sr-only" htmlFor={sortId}>
          Sort products
        </label>
        <select
          id={sortId}
          className="min-h-[46px] w-full rounded-full border border-mc-ink/20 bg-white px-4 py-2 text-sm font-semibold text-mc-ink shadow-sm transition hover:bg-zinc-50 sm:min-w-[11rem]"
          value={sortValue}
          onChange={(e) => {
            const p = new URLSearchParams(searchParams.toString());
            p.set("sort", e.target.value);
            // Sort changes invalidate the current page.
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
      </div>
    </div>
  );
}
