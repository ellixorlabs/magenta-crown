"use client";

import { useRef, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import type { ShopFilterOptions } from "@/lib/shop-filter-shared";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { useShopFilterSheet } from "@/components/shop/ShopFilterSheetProvider";

function subscribeReducedMotion(notify: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
}

function reducedMotionMatches() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Single duration so column width and panel fade move together (open + close). */
const SYNC_TRANSITION_MS = 300;

type Props = {
  options: ShopFilterOptions;
  basePath: string;
  enablePriceSlider?: boolean;
  hideOutOfStockToggle?: boolean;
  preserveQueryKeys?: readonly string[];
  omitUrlFilterKeys?: readonly string[];
  hideCategoryFilter?: boolean;
  hideFacetFields?: readonly ("style" | "occasion" | "material")[];
};

/**
 * Desktop-only sticky filter column. Uses deferred URL state + explicit Apply / Clear all
 * so checkbox taps stay instant (no router push per click).
 */
export function ShopFilterDesktopSidebar({
  options,
  basePath,
  enablePriceSlider = true,
  hideOutOfStockToggle = true,
  preserveQueryKeys = [],
  omitUrlFilterKeys = [],
  hideCategoryFilter = false,
  hideFacetFields = []
}: Props) {
  const applyFiltersRef = useRef<(() => void) | null>(null);
  const { isFiltersOpen, closeFilters } = useShopFilterSheet();
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionMatches, () => false);

  const easeColumn = "cubic-bezier(0.22, 1, 0.36, 1)";
  const easePanel = "cubic-bezier(0.32, 0.72, 0, 1)";

  const columnStyle = reduceMotion
    ? undefined
    : {
        transitionProperty: "width, max-width, margin-inline-end",
        transitionDuration: `${SYNC_TRANSITION_MS}ms`,
        transitionTimingFunction: easeColumn
      };

  const panelStyle = reduceMotion
    ? undefined
    : {
        transitionProperty: "opacity, transform",
        transitionDuration: `${SYNC_TRANSITION_MS}ms`,
        transitionTimingFunction: easePanel
      };

  return (
    <aside
      id="shop-desktop-filters"
      className={[
        "order-2 hidden min-w-0 shrink-0 overflow-hidden lg:order-1 lg:block",
        isFiltersOpen
          ? "lg:w-[280px] lg:max-w-[280px] xl:w-[300px] xl:max-w-[300px]"
          : "lg:w-0 lg:max-w-0 lg:-mr-8"
      ].join(" ")}
      style={columnStyle}
      aria-hidden={!isFiltersOpen}
    >
      <div className="lg:sticky lg:top-28 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
        <div
          className={[
            "rounded-2xl border border-mc-ink/10 bg-white/95 p-4 shadow-sm ring-1 ring-mc-ink/[0.04] backdrop-blur-md",
            isFiltersOpen ? "pointer-events-auto" : "pointer-events-none",
            isFiltersOpen ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"
          ].join(" ")}
          style={panelStyle}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-mc-gold">Refine</p>
            <button
              type="button"
              onClick={closeFilters}
              className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mc-ink/70 transition hover:bg-mc-ink/5 hover:text-mc-ink"
              aria-label="Close filters"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mt-3">
            <ShopFilters
              options={options}
              basePath={basePath}
              enablePriceSlider={enablePriceSlider}
              hideOutOfStockToggle={hideOutOfStockToggle}
              layout="stack"
              omitSort
              compact
              deferUrlUntilApply
              applyFiltersRef={applyFiltersRef}
              showApplyButton
              preserveQueryKeys={preserveQueryKeys}
              omitUrlFilterKeys={omitUrlFilterKeys}
              hideCategoryFilter={hideCategoryFilter}
              hideFacetFields={hideFacetFields}
              hideClearButton={false}
              priceSliderCommitOnChange={false}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
