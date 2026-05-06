"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { ShopFilterOptions } from "@/lib/shop-filter-shared";
import { PRICE_BUCKETS, minMaxToPriceBucket, priceBucketToMinMax } from "@/lib/shop-filter-shared";
import { PriceRangeSlider, type PriceRangeSliderHandle } from "@/components/shop/PriceRangeSlider";

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
  /** Used by the mobile drawer so the panel can provide its own Clear button. */
  hideClearButton?: boolean;
  /** When true, commits the price filter while dragging (avoid for mobile — use explicit Apply instead). */
  priceSliderCommitOnChange?: boolean;
  /** Tighter spacing for mobile sheet. */
  compact?: boolean;
  /**
   * Mobile filter sheet: keep edits in memory until `applyFiltersRef` runs (footer Apply).
   * Avoids router churn / lag while selecting many filters.
   */
  deferUrlUntilApply?: boolean;
  /** When `deferUrlUntilApply`, assign `() => push draft + price to URL`. */
  applyFiltersRef?: MutableRefObject<(() => void) | null>;
};

type ShopFilterDraft = {
  sort: string;
  status: string[];
  category: string[];
  occasion: string[];
  style: string[];
  material: string[];
  color: string[];
  size: string[];
  minPrice: string | null;
  maxPrice: string | null;
  viewList: boolean;
  cols: 2 | 3 | 4 | 5 | 6;
  hideOutOfStock: boolean;
};

function buildShopFilterDraft(sp: { get: (key: string) => string | null; getAll: (key: string) => string[] }): ShopFilterDraft {
  const colsRaw = Number(sp.get("cols") ?? "5");
  const cols = ([2, 3, 4, 5, 6].includes(colsRaw) ? colsRaw : 5) as 2 | 3 | 4 | 5 | 6;
  return {
    sort: sp.get("sort") ?? "new",
    status: [...new Set(sp.getAll("status"))],
    category: [...new Set(sp.getAll("category"))],
    occasion: [...new Set(sp.getAll("occasion"))],
    style: [...new Set(sp.getAll("style"))],
    material: [...new Set(sp.getAll("material"))],
    color: [...new Set(sp.getAll("color"))],
    size: [...new Set(sp.getAll("size"))],
    minPrice: sp.get("minPrice"),
    maxPrice: sp.get("maxPrice"),
    viewList: sp.get("view") === "list",
    cols,
    hideOutOfStock: sp.get("hideOutOfStock") === "1"
  };
}

const DRAFT_URL_KEYS = [
  "status",
  "category",
  "occasion",
  "style",
  "material",
  "color",
  "size",
  "minPrice",
  "maxPrice",
  "sort",
  "view",
  "cols",
  "hideOutOfStock"
] as const;

function mergeDraftIntoSearchParams(
  base: URLSearchParams,
  draft: ShopFilterDraft,
  price: { min: string | null; max: string | null },
  enablePriceSlider: boolean
): URLSearchParams {
  const next = new URLSearchParams(base.toString());
  for (const k of DRAFT_URL_KEYS) next.delete(k);
  for (const v of draft.status) next.append("status", v);
  for (const v of draft.category) next.append("category", v);
  for (const v of draft.occasion) next.append("occasion", v);
  for (const v of draft.style) next.append("style", v);
  for (const v of draft.material) next.append("material", v);
  for (const v of draft.color) next.append("color", v);
  for (const v of draft.size) next.append("size", v);
  next.set("sort", draft.sort);
  if (draft.viewList) {
    next.set("view", "list");
    next.delete("cols");
  } else {
    next.delete("view");
    next.set("cols", String(draft.cols));
  }
  if (draft.hideOutOfStock) next.set("hideOutOfStock", "1");
  if (enablePriceSlider) {
    if (price.min) next.set("minPrice", price.min);
    if (price.max) next.set("maxPrice", price.max);
  } else {
    if (draft.minPrice) next.set("minPrice", draft.minPrice);
    if (draft.maxPrice) next.set("maxPrice", draft.maxPrice);
  }
  next.set("page", "1");
  return next;
}

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

function MultiFilterGroup({
  fieldName,
  label,
  options,
  selected,
  compact,
  bar,
  onToggle,
  onClear
}: {
  fieldName: string;
  label: string;
  options: string[];
  selected: string[];
  compact: boolean;
  bar: boolean;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const lab = labelClass(bar, compact);
  const scrollClass = bar
    ? "max-h-28 overflow-y-auto sm:max-h-32"
    : compact
      ? "max-h-40 overflow-y-auto"
      : "max-h-52 overflow-y-auto";

  return (
    <div className={bar ? "min-w-0 w-full" : ""}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={lab}>{label}</span>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-crown-800 hover:text-crown-950"
          >
            Clear
          </button>
        ) : null}
      </div>
      <fieldset
        className={[
          "mt-1 rounded-lg border border-zinc-300 bg-white shadow-sm",
          bar ? "px-2 py-2" : compact ? "px-2 py-2" : "px-3 py-2.5",
          scrollClass
        ].join(" ")}
      >
        <legend className="sr-only">{label}</legend>
        {options.length === 0 ? (
          <p className="text-xs text-zinc-500">No values yet</p>
        ) : (
          <div className={bar ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}>
            {options.map((opt, i) => {
              const id = `${fieldName}-opt-${i}`;
              const isOn = selected.includes(opt);
              return (
                <label
                  key={`${fieldName}-${i}-${opt}`}
                  htmlFor={id}
                  className={`flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 hover:bg-zinc-50 ${isOn ? "bg-zinc-100/80" : ""}`}
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={isOn}
                    onChange={() => onToggle(opt)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400 accent-zinc-950"
                  />
                  <span
                    className={`text-zinc-800 ${compact ? "text-xs leading-snug" : bar ? "text-xs leading-snug" : "text-sm leading-snug"}`}
                  >
                    {opt}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}

function ViewToggle({
  isList,
  cols,
  onSet
}: {
  isList: boolean;
  cols: 2 | 3 | 4 | 5 | 6 | null;
  onSet: (mode: "list" | "grid", gridCols?: 2 | 3 | 4 | 5 | 6) => void;
}) {
  const btn = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 border border-zinc-200"}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700">View</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {btn("List", isList, () => onSet("list"))}
        {btn("2 Col", !isList && cols === 2, () => onSet("grid", 2))}
        {btn("5 Col", !isList && cols === 5, () => onSet("grid", 5))}
        {btn("6 Col", !isList && cols === 6, () => onSet("grid", 6))}
      </div>
    </div>
  );
}

export function ShopFilters({
  options,
  basePath,
  enablePriceSlider = false,
  layout = "stack",
  hideOutOfStockToggle = false,
  omitSort = false,
  hideClearButton = false,
  priceSliderCommitOnChange = false,
  compact = false,
  deferUrlUntilApply = false,
  applyFiltersRef
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bar = layout === "adminBar";
  const priceSliderRef = useRef<PriceRangeSliderHandle | null>(null);

  const [draft, setDraft] = useState<ShopFilterDraft | null>(() =>
    deferUrlUntilApply ? buildShopFilterDraft(searchParams) : null
  );

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      });
      // Filter changes should restart pagination to avoid empty pages.
      next.set("page", "1");
      const q = next.toString();
      router.push(q ? `${basePath}?${q}` : basePath);
    },
    [router, searchParams, basePath]
  );

  const toggleMulti = useCallback(
    (key: string, value: string) => {
      if (deferUrlUntilApply) {
        const multiKey = key as keyof Pick<
          ShopFilterDraft,
          "status" | "category" | "occasion" | "style" | "material" | "color" | "size"
        >;
        setDraft((d) => {
          if (!d) return d;
          const list = [...d[multiKey]];
          const nextVals = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
          return { ...d, [multiKey]: nextVals };
        });
        return;
      }
      const next = new URLSearchParams(searchParams.toString());
      const cur = next.getAll(key);
      const nextVals = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      next.delete(key);
      for (const v of nextVals) next.append(key, v);
      next.set("page", "1");
      const q = next.toString();
      router.push(q ? `${basePath}?${q}` : basePath, { scroll: false });
    },
    [router, searchParams, basePath, deferUrlUntilApply]
  );

  const clearMulti = useCallback(
    (key: string) => {
      if (deferUrlUntilApply) {
        const multiKey = key as keyof Pick<
          ShopFilterDraft,
          "status" | "category" | "occasion" | "style" | "material" | "color" | "size"
        >;
        setDraft((d) => (d ? { ...d, [multiKey]: [] } : d));
        return;
      }
      const next = new URLSearchParams(searchParams.toString());
      next.delete(key);
      next.set("page", "1");
      const q = next.toString();
      router.push(q ? `${basePath}?${q}` : basePath, { scroll: false });
    },
    [router, searchParams, basePath, deferUrlUntilApply]
  );

  const priceBucket = minMaxToPriceBucket(
    deferUrlUntilApply && draft
      ? (draft.minPrice ?? undefined)
      : (searchParams.get("minPrice") ?? undefined),
    deferUrlUntilApply && draft ? (draft.maxPrice ?? undefined) : (searchParams.get("maxPrice") ?? undefined)
  );

  const hideOos = deferUrlUntilApply && draft ? draft.hideOutOfStock : searchParams.get("hideOutOfStock") === "1";
  const isList = deferUrlUntilApply && draft ? draft.viewList : searchParams.get("view") === "list";
  const colsRaw = deferUrlUntilApply && draft ? draft.cols : Number(searchParams.get("cols") ?? "5");
  const cols = [2, 3, 4, 5, 6].includes(colsRaw) ? (colsRaw as 2 | 3 | 4 | 5 | 6) : 5;

  const categorySelFromUrl = useMemo(() => [...new Set(searchParams.getAll("category"))], [searchParams]);
  const statusSelFromUrl = useMemo(() => [...new Set(searchParams.getAll("status"))], [searchParams]);
  const occasionSelFromUrl = useMemo(() => [...new Set(searchParams.getAll("occasion"))], [searchParams]);
  const styleSelFromUrl = useMemo(() => [...new Set(searchParams.getAll("style"))], [searchParams]);
  const materialSelFromUrl = useMemo(() => [...new Set(searchParams.getAll("material"))], [searchParams]);
  const colorSelFromUrl = useMemo(() => [...new Set(searchParams.getAll("color"))], [searchParams]);
  const sizeSelFromUrl = useMemo(() => [...new Set(searchParams.getAll("size"))], [searchParams]);

  const statusSel = deferUrlUntilApply && draft ? draft.status : statusSelFromUrl;
  const categorySel = deferUrlUntilApply && draft ? draft.category : categorySelFromUrl;
  const occasionSel = deferUrlUntilApply && draft ? draft.occasion : occasionSelFromUrl;
  const styleSel = deferUrlUntilApply && draft ? draft.style : styleSelFromUrl;
  const materialSel = deferUrlUntilApply && draft ? draft.material : materialSelFromUrl;
  const colorSel = deferUrlUntilApply && draft ? draft.color : colorSelFromUrl;
  const sizeSel = deferUrlUntilApply && draft ? draft.size : sizeSelFromUrl;

  const setLayout = useCallback(
    (mode: "list" | "grid", gridCols?: 2 | 3 | 4 | 5 | 6) => {
      if (deferUrlUntilApply) {
        setDraft((d) => {
          if (!d) return d;
          if (mode === "list") return { ...d, viewList: true };
          return { ...d, viewList: false, cols: gridCols ?? d.cols };
        });
        return;
      }
      const next = new URLSearchParams(searchParams.toString());
      if (mode === "list") {
        next.set("view", "list");
        next.delete("cols");
      } else {
        next.delete("view");
        if (gridCols != null) next.set("cols", String(gridCols));
      }
      next.set("page", "1");
      const q = next.toString();
      router.push(q ? `${basePath}?${q}` : basePath);
    },
    [basePath, router, searchParams, deferUrlUntilApply]
  );

  const onPriceSliderCommit = useCallback(
    (min: string | null, max: string | null) => {
      if (deferUrlUntilApply) return;
      update({ minPrice: min, maxPrice: max });
    },
    [deferUrlUntilApply, update]
  );

  const pushDeferredFilters = useCallback(() => {
    if (!deferUrlUntilApply || !draft) return;
    const price =
      enablePriceSlider && priceSliderRef.current
        ? priceSliderRef.current.peekDraftCommit()
        : { min: draft.minPrice, max: draft.maxPrice };
    const next = mergeDraftIntoSearchParams(
      new URLSearchParams(searchParams.toString()),
      draft,
      price,
      enablePriceSlider
    );
    const q = next.toString();
    router.push(q ? `${basePath}?${q}` : basePath, { scroll: false });
  }, [deferUrlUntilApply, draft, enablePriceSlider, searchParams, router, basePath]);

  useLayoutEffect(() => {
    if (!applyFiltersRef) return;
    if (!deferUrlUntilApply) {
      applyFiltersRef.current = null;
      return;
    }
    applyFiltersRef.current = () => pushDeferredFilters();
  }, [applyFiltersRef, deferUrlUntilApply, pushDeferredFilters]);

  const sel = selectClass(bar, compact);
  const lab = labelClass(bar, compact);

  const filters = (
    <>
      {!omitSort && (
        <div className={bar ? "min-w-0 w-full" : ""}>
          <label className={lab} htmlFor="sort">
            Sort
          </label>
          <select
            id="sort"
            className={sel}
            value={deferUrlUntilApply && draft ? draft.sort : (searchParams.get("sort") ?? "new")}
            onChange={(e) => {
              if (deferUrlUntilApply) {
                setDraft((d) => (d ? { ...d, sort: e.target.value } : d));
              } else {
                update({ sort: e.target.value });
              }
            }}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {compact && (
        <ViewToggle isList={isList} cols={cols} onSet={setLayout} />
      )}

      {enablePriceSlider ? (
        <div className={bar ? "min-w-0 w-full" : ""}>
          <label className={lab}>Price (MRP)</label>
          <div className={bar ? "mt-1 rounded-xl border border-zinc-200 bg-white/90 px-3 py-3" : "mt-2 rounded-xl border border-zinc-200 bg-white/80 px-3 py-4"}>
            <PriceRangeSlider
              ref={priceSliderRef}
              boundsMin={options.priceMin}
              boundsMax={options.priceMax}
              urlMin={deferUrlUntilApply && draft ? draft.minPrice : searchParams.get("minPrice")}
              urlMax={deferUrlUntilApply && draft ? draft.maxPrice : searchParams.get("maxPrice")}
              onCommit={onPriceSliderCommit}
              commitOnChange={priceSliderCommitOnChange}
              singleHandle={compact}
            />
          </div>
        </div>
      ) : (
        <div className={bar ? "min-w-0 w-full" : ""}>
          <label className={lab}>Price Bucket</label>
          <select
            id="price"
            className={sel}
            value={priceBucket}
            onChange={(e) => {
              const { min, max } = priceBucketToMinMax(e.target.value);
              if (deferUrlUntilApply) {
                setDraft((d) => (d ? { ...d, minPrice: min, maxPrice: max } : d));
              } else {
                update({
                  minPrice: min,
                  maxPrice: max
                });
              }
            }}
          >
            {PRICE_BUCKETS.map((b) => (
              <option key={b.label} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {bar && options.statuses?.length ? (
        <MultiFilterGroup
          fieldName="status"
          label="Status"
          options={options.statuses}
          selected={statusSel}
          compact={compact}
          bar={bar}
          onToggle={(v) => toggleMulti("status", v)}
          onClear={() => clearMulti("status")}
        />
      ) : null}

      <MultiFilterGroup
        fieldName="category"
        label="Category"
        options={options.categories}
        selected={categorySel}
        compact={compact}
        bar={bar}
        onToggle={(v) => toggleMulti("category", v)}
        onClear={() => clearMulti("category")}
      />

      <MultiFilterGroup
        fieldName="occasion"
        label="Occasion"
        options={options.occasions}
        selected={occasionSel}
        compact={compact}
        bar={bar}
        onToggle={(v) => toggleMulti("occasion", v)}
        onClear={() => clearMulti("occasion")}
      />

      <MultiFilterGroup
        fieldName="style"
        label="Style"
        options={options.styles}
        selected={styleSel}
        compact={compact}
        bar={bar}
        onToggle={(v) => toggleMulti("style", v)}
        onClear={() => clearMulti("style")}
      />

      <MultiFilterGroup
        fieldName="material"
        label="Material"
        options={options.materials}
        selected={materialSel}
        compact={compact}
        bar={bar}
        onToggle={(v) => toggleMulti("material", v)}
        onClear={() => clearMulti("material")}
      />

      <div className={bar ? "grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-2" : "grid grid-cols-2 gap-3"}>
        <MultiFilterGroup
          fieldName="color"
          label="Color"
          options={options.colors}
          selected={colorSel}
          compact={compact}
          bar={bar}
          onToggle={(v) => toggleMulti("color", v)}
          onClear={() => clearMulti("color")}
        />
        <MultiFilterGroup
          fieldName="size"
          label="Size"
          options={options.sizes}
          selected={sizeSel}
          compact={compact}
          bar={bar}
          onToggle={(v) => toggleMulti("size", v)}
          onClear={() => clearMulti("size")}
        />
      </div>


      {!hideClearButton && (
        <div className={bar ? "flex min-w-0 w-full items-end pb-0.5" : ""}>
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
      )}

      {hideOutOfStockToggle && !bar && (
        <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/90 p-3">
          <p className="text-xs font-semibold text-zinc-700">Availability</p>
          <button
            type="button"
            className="mt-2 w-full rounded-full border border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            onClick={() => {
              if (deferUrlUntilApply) {
                setDraft((d) => (d ? { ...d, hideOutOfStock: !d.hideOutOfStock } : d));
              } else {
                update({ hideOutOfStock: hideOos ? null : "1" });
              }
            }}
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
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filters}</div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2.5 text-xs sm:text-sm" : "space-y-5 text-sm"}>{filters}</div>
  );
}
