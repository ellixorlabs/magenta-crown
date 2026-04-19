"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";
import type { ShopFilterOptions } from "@/lib/shop-filter-options";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { ShopFilters } from "@/components/shop/ShopFilters";

type Props = {
  options: ShopFilterOptions;
  basePath: string;
  enablePriceSlider?: boolean;
  hideOutOfStockToggle?: boolean;
  /** Hide the default full-width trigger (toolbar provides Filter). */
  hideTrigger?: boolean;
  /** Controlled open state (used with `hideTrigger`). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Omit sort inside the sheet (sort lives in shop toolbar). */
  omitSortInSheet?: boolean;
};

function FiltersBody({
  options,
  basePath,
  enablePriceSlider,
  hideOutOfStockToggle,
  omitSortInSheet
}: Pick<Props, "options" | "basePath" | "enablePriceSlider" | "hideOutOfStockToggle" | "omitSortInSheet">) {
  return (
    <ShopFilters
      options={options}
      basePath={basePath}
      enablePriceSlider={enablePriceSlider}
      hideOutOfStockToggle={hideOutOfStockToggle}
      compact
      layout="stack"
      omitSort={Boolean(omitSortInSheet)}
    />
  );
}

export function ShopFiltersMobileSheet(props: Props) {
  const {
    hideTrigger,
    open: controlledOpen,
    onOpenChange,
    omitSortInSheet,
    options,
    basePath,
    enablePriceSlider,
    hideOutOfStockToggle
  } = props;
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const [mounted, setMounted] = useState(false);

  const onClose = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  const overlay =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[25000] flex flex-col justify-end sm:justify-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-filters-sheet-title"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <button
          type="button"
          aria-label="Close filters"
          className="absolute inset-0 bg-zinc-900/45 backdrop-blur-md transition"
          onClick={onClose}
        />
        <div
          className="relative z-[1] flex max-h-[min(88dvh,780px)] w-full flex-col rounded-t-2xl border border-white/35 bg-white/92 shadow-2xl backdrop-blur-2xl sm:mx-auto sm:max-w-md sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/80 px-3 pb-2 pt-3 sm:px-4 sm:pb-2.5 sm:pt-3.5">
            <h2
              id="shop-filters-sheet-title"
              className="font-[family-name:var(--font-heading)] text-base font-semibold text-zinc-900 sm:text-lg"
            >
              Filter
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-3">
            <Suspense fallback={<p className="text-xs text-zinc-500">Loading filters…</p>}>
              <FiltersBody
                options={options}
                basePath={basePath}
                enablePriceSlider={enablePriceSlider}
                hideOutOfStockToggle={hideOutOfStockToggle}
                omitSortInSheet={omitSortInSheet}
              />
            </Suspense>
          </div>
          <div className="shrink-0 border-t border-zinc-200/80 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-crown-800 py-2.5 text-sm font-semibold text-white transition hover:bg-crown-900 sm:py-3"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    ) : null;

  /** When `hideTrigger`, do not render a `w-full` wrapper — it becomes an extra flex sibling on /shop and can collapse the product column to 0 width. */
  if (hideTrigger) {
    return <>{mounted && overlay ? createPortal(overlay, document.body) : null}</>;
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200/90 bg-white/90 py-3 text-sm font-semibold text-zinc-900 shadow-sm backdrop-blur-sm transition hover:bg-white active:bg-zinc-50"
      >
        <SlidersHorizontal className="h-4 w-4 text-crown-800" aria-hidden />
        Filter &amp; Sort
      </button>

      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </div>
  );
}
