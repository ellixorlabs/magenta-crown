"use client";

import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ShopFilterOptions } from "@/lib/shop-filter-shared";
import { buildShopUrlPreservingOnly } from "@/lib/shop-clear-url";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { ShopFilters } from "@/components/shop/ShopFilters";

function subscribeMaxLg(notify: () => void) {
  const mq = window.matchMedia("(max-width: 1023px)");
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
}

function maxLgMatches() {
  return window.matchMedia("(max-width: 1023px)").matches;
}

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
  preserveQueryKeys?: readonly string[];
  omitUrlFilterKeys?: readonly string[];
  hideCategoryFilter?: boolean;
  hideFacetFields?: readonly ("style" | "occasion" | "material")[];
};

function FiltersBody({
  options,
  basePath,
  enablePriceSlider,
  hideOutOfStockToggle,
  omitSortInSheet,
  applyFiltersRef,
  preserveQueryKeys = [],
  omitUrlFilterKeys = [],
  hideCategoryFilter = false,
  hideFacetFields = []
}: Pick<
  Props,
  | "options"
  | "basePath"
  | "enablePriceSlider"
  | "hideOutOfStockToggle"
  | "omitSortInSheet"
  | "preserveQueryKeys"
  | "omitUrlFilterKeys"
  | "hideCategoryFilter"
  | "hideFacetFields"
> & {
  applyFiltersRef: MutableRefObject<(() => void) | null>;
}) {
  return (
    <ShopFilters
      options={options}
      basePath={basePath}
      enablePriceSlider={enablePriceSlider}
      hideOutOfStockToggle={hideOutOfStockToggle}
      compact
      layout="stack"
      omitSort={Boolean(omitSortInSheet)}
      hideClearButton
      priceSliderCommitOnChange={false}
      deferUrlUntilApply
      applyFiltersRef={applyFiltersRef}
      preserveQueryKeys={preserveQueryKeys}
      omitUrlFilterKeys={omitUrlFilterKeys}
      hideCategoryFilter={hideCategoryFilter}
      hideFacetFields={hideFacetFields}
    />
  );
}

export function ShopFiltersMobileSheet(props: Props) {
  const {
    hideTrigger,
    open: controlledOpen,
    onOpenChange,
    omitSortInSheet,
    preserveQueryKeys = [],
    omitUrlFilterKeys = [],
    hideCategoryFilter = false,
    hideFacetFields = [],
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
  const [animating, setAnimating] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const applyFiltersRef = useRef<(() => void) | null>(null);

  const mobileSheetViewport = useSyncExternalStore(subscribeMaxLg, maxLgMatches, () => false);
  const shouldLockBodyScroll = Boolean(open && mobileSheetViewport);

  const onClose = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setAnimating(false);
      return;
    }

    // Two-phase open so the drawer can slide in smoothly.
    setAnimating(false);
    const raf = requestAnimationFrame(() => setAnimating(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  /** Desktop uses `ShopFilterDesktopSidebar` — lock body only when the mobile drawer exists (`< lg`). */
  useEffect(() => {
    if (!shouldLockBodyScroll) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [shouldLockBodyScroll]);

  const showMobileOverlay = Boolean(open && mounted && mobileSheetViewport);

  const overlay = showMobileOverlay ? (
      <div
        className="fixed inset-0 z-[25000]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-filters-sheet-title"
      >
        <button
          type="button"
          aria-label="Close filters"
          className="absolute inset-0 bg-zinc-900/45 backdrop-blur-md transition"
          onClick={onClose}
        />

        <div
          className={[
            "absolute left-0 top-0 flex h-full max-h-dvh min-h-0 w-[min(92vw,420px)] flex-col border-r border-white/30 bg-white/95 shadow-2xl backdrop-blur-2xl",
            "transition-transform duration-300 ease-out",
            animating ? "translate-x-0" : "-translate-x-full"
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 touch-pan-y sm:px-4 sm:py-3"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <Suspense fallback={<p className="text-xs text-zinc-500">Loading filters…</p>}>
              <FiltersBody
                options={options}
                basePath={basePath}
                enablePriceSlider={enablePriceSlider}
                hideOutOfStockToggle={hideOutOfStockToggle}
                omitSortInSheet={omitSortInSheet}
                applyFiltersRef={applyFiltersRef}
                preserveQueryKeys={preserveQueryKeys}
                omitUrlFilterKeys={omitUrlFilterKeys}
                hideCategoryFilter={hideCategoryFilter}
                hideFacetFields={hideFacetFields}
              />
            </Suspense>
          </div>

          <div className="shrink-0 border-t border-zinc-200/80 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  applyFiltersRef.current?.();
                  onClose();
                }}
                className="rounded-full bg-crown-800 py-2.5 text-sm font-semibold text-white transition hover:bg-crown-900"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={() => {
                  const href =
                    preserveQueryKeys.length > 0
                      ? buildShopUrlPreservingOnly(basePath, searchParams, preserveQueryKeys)
                      : basePath;
                  router.push(href);
                  onClose();
                }}
                className="rounded-full border border-zinc-300 bg-white py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Clear all
              </button>
            </div>
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
        Filters
      </button>

      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </div>
  );
}
