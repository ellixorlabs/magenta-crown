"use client";

import { SlidersHorizontal } from "lucide-react";
import { useCallback, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShopFilterSheet } from "@/components/shop/ShopFilterSheetProvider";

const sortOptions = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Alphabetically, A–Z" }
];

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

  const onFilterClick = useCallback(() => {
    openFilters();
  }, [openFilters]);

  const sortValue = searchParams.get("sort") ?? "new";

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
      <button
        type="button"
        onClick={onFilterClick}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 sm:justify-start"
      >
        <SlidersHorizontal className="h-4 w-4 text-crown-800" aria-hidden />
        Filter
      </button>

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
