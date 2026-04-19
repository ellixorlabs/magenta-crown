"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { ShopFilterOptions } from "@/lib/shop-filter-options";
import { PRICE_BUCKETS, minMaxToPriceBucket, priceBucketToMinMax } from "@/lib/shop-filter-options";
import { PriceRangeSlider } from "@/components/shop/PriceRangeSlider";

const sortOptions = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Alphabetically, A–Z" }
];

type Props = {
  options: ShopFilterOptions;
  basePath: string;
  enablePriceSlider?: boolean;
  /** Admin inventory: horizontal pill bar. Storefront: vertical stack. */
  layout?: "stack" | "adminBar";
  /** Storefront only: toggle to hide products with no sellable stock (default: show full catalog). */
  hideOutOfStockToggle?: boolean;
  /** Hide sort control (e.g. when sort lives in the shop toolbar). */
  omitSort?: boolean;
  /** Tighter spacing for mobile sheet. */
  compact?: boolean;
};

function selectClass(bar: boolean, compact: boolean) {
  if (bar) {
    return "mt-1 w-full min-w-[8rem] rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-900 shadow-sm";
  }
  if (compact) {
    return "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 shadow-sm";
  }
  return "mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm";
}

function labelClass(bar: boolean, compact: boolean) {
  if (bar) return "text-[10px] font-semibold uppercase tracking-wider text-zinc-600";
  if (compact) return "text-[11px] font-semibold uppercase tracking-wide text-zinc-700";
  return "font-semibold text-zinc-900";
}

export function ShopFilters({
  options,
  basePath,
  enablePriceSlider = false,
  layout = "stack",
  hideOutOfStockToggle = false,
  omitSort = false,
  compact = false
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bar = layout === "adminBar";

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      });
      const q = next.toString();
      router.push(q ? `${basePath}?${q}` : basePath);
    },
    [router, searchParams, basePath]
  );

  const anyOpt = useMemo(
    () => (items: string[]) => [{ value: "", label: "Any" }, ...items.map((v) => ({ value: v, label: v }))],
    []
  );

  const priceBucket = minMaxToPriceBucket(
    searchParams.get("minPrice") ?? undefined,
    searchParams.get("maxPrice") ?? undefined
  );

  const hideOos = searchParams.get("hideOutOfStock") === "1";

  const onPriceSliderCommit = useCallback(
    (min: string | null, max: string | null) => {
      update({ minPrice: min, maxPrice: max });
    },
    [update]
  );

  const sel = selectClass(bar, compact);
  const lab = labelClass(bar, compact);

  const filters = (
    <>
      {!omitSort && (
        <div className={bar ? "min-w-[120px] flex-1" : ""}>
          <label className={lab} htmlFor="sort">
            Sort
          </label>
          <select
            id="sort"
            className={sel}
            value={searchParams.get("sort") ?? "new"}
            onChange={(e) => update({ sort: e.target.value })}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={bar ? "min-w-[120px] flex-1" : ""}>
        <label className={lab} htmlFor="category">
          Category
        </label>
        <select
          id="category"
          className={sel}
          value={searchParams.get("category") ?? ""}
          onChange={(e) => update({ category: e.target.value || null })}
        >
          {anyOpt(options.categories).map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className={bar ? "min-w-[120px] flex-1" : ""}>
        <label className={lab} htmlFor="occasion">
          Occasion
        </label>
        <select
          id="occasion"
          className={sel}
          value={searchParams.get("occasion") ?? ""}
          onChange={(e) => update({ occasion: e.target.value || null })}
        >
          {anyOpt(options.occasions).map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className={bar ? "min-w-[120px] flex-1" : ""}>
        <label className={lab} htmlFor="style">
          Style
        </label>
        <select
          id="style"
          className={sel}
          value={searchParams.get("style") ?? ""}
          onChange={(e) => update({ style: e.target.value || null })}
        >
          {anyOpt(options.styles).map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className={bar ? "min-w-[120px] flex-1" : ""}>
        <label className={lab} htmlFor="material">
          Material
        </label>
        <select
          id="material"
          className={sel}
          value={searchParams.get("material") ?? ""}
          onChange={(e) => update({ material: e.target.value || null })}
        >
          {anyOpt(options.materials).map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className={bar ? "grid min-w-[200px] flex-[1.5] grid-cols-2 gap-2" : "grid grid-cols-2 gap-3"}>
        <div>
          <label className={lab} htmlFor="color">
            Color
          </label>
          <select
            id="color"
            className={sel}
            value={searchParams.get("color") ?? ""}
            onChange={(e) => update({ color: e.target.value || null })}
          >
            {anyOpt(options.colors).map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lab} htmlFor="size">
            Size
          </label>
          <select
            id="size"
            className={sel}
            value={searchParams.get("size") ?? ""}
            onChange={(e) => update({ size: e.target.value || null })}
          >
            {anyOpt(options.sizes).map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={bar ? "min-w-[200px] flex-[2]" : ""}>
        <label className={lab}>Price (MRP)</label>
        {enablePriceSlider ? (
          <div className={bar ? "mt-1 rounded-xl border border-zinc-200 bg-white/90 px-3 py-3" : "mt-2 rounded-xl border border-zinc-200 bg-white/80 px-3 py-4"}>
            <PriceRangeSlider
              boundsMin={options.priceMin}
              boundsMax={options.priceMax}
              urlMin={searchParams.get("minPrice")}
              urlMax={searchParams.get("maxPrice")}
              onCommit={onPriceSliderCommit}
            />
          </div>
        ) : (
          <select
            id="price"
            className={sel}
            value={priceBucket}
            onChange={(e) => {
              const { min, max } = priceBucketToMinMax(e.target.value);
              update({
                minPrice: min,
                maxPrice: max
              });
            }}
          >
            {PRICE_BUCKETS.map((b) => (
              <option key={b.label} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={bar ? "flex shrink-0 items-end pb-0.5" : ""}>
        <button
          type="button"
          className={
            bar
              ? "rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
              : "w-full rounded-full border border-zinc-300 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 active:bg-zinc-100"
          }
          onClick={() => router.push(basePath)}
        >
          Clear
        </button>
      </div>

      {hideOutOfStockToggle && !bar && (
        <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/90 p-3">
          <p className="text-xs font-semibold text-zinc-700">Availability</p>
          <button
            type="button"
            className="mt-2 w-full rounded-full border border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            onClick={() => update({ hideOutOfStock: hideOos ? null : "1" })}
          >
            {hideOos ? "Showing in-stock only — tap to show all products" : "Hide out of stock"}
          </button>
        </div>
      )}
    </>
  );

  if (bar) {
    return (
      <div className="rounded-2xl border border-zinc-300/90 bg-gradient-to-r from-white via-zinc-50/98 to-white/95 p-4 shadow-lg shadow-zinc-900/10 backdrop-blur-xl">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-4">{filters}</div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2.5 text-xs sm:text-sm" : "space-y-5 text-sm"}>{filters}</div>
  );
}
