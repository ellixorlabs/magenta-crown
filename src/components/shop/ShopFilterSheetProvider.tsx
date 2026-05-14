"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode
} from "react";
import { ShopFiltersMobileSheet } from "@/components/shop/ShopFiltersMobileSheet";
import { ShopScrollToTopFab } from "@/components/shop/ShopScrollToTopFab";

type SheetCtx = {
  isFiltersOpen: boolean;
  openFilters: () => void;
  closeFilters: () => void;
  toggleFilters: () => void;
};

const ShopFilterSheetContext = createContext<SheetCtx | null>(null);

export function useShopFilterSheet(): SheetCtx {
  const v = useContext(ShopFilterSheetContext);
  if (!v) throw new Error("useShopFilterSheet must be used within ShopFilterSheetProvider");
  return v;
}

type SheetProps = ComponentProps<typeof ShopFiltersMobileSheet>;

export function ShopFilterSheetProvider({
  children,
  preserveQueryKeys,
  omitUrlFilterKeys,
  hideCategoryFilter,
  hideFacetFields,
  ...sheetProps
}: SheetProps & {
  children: ReactNode;
  preserveQueryKeys?: readonly string[];
  omitUrlFilterKeys?: readonly string[];
  hideCategoryFilter?: boolean;
  hideFacetFields?: readonly ("style" | "occasion" | "material")[];
}) {
  const [open, setOpen] = useState(false);
  const openFilters = useCallback(() => setOpen(true), []);
  const closeFilters = useCallback(() => setOpen(false), []);
  const toggleFilters = useCallback(() => setOpen((v) => !v), []);
  const value = useMemo(
    () => ({ isFiltersOpen: open, openFilters, closeFilters, toggleFilters }),
    [open, openFilters, closeFilters, toggleFilters]
  );

  return (
    <ShopFilterSheetContext.Provider value={value}>
      {children}
      <ShopFiltersMobileSheet
        {...sheetProps}
        preserveQueryKeys={preserveQueryKeys}
        omitUrlFilterKeys={omitUrlFilterKeys}
        hideCategoryFilter={hideCategoryFilter}
        hideFacetFields={hideFacetFields}
        hideTrigger
        open={open}
        onOpenChange={setOpen}
        omitSortInSheet
      />
      <ShopScrollToTopFab />
    </ShopFilterSheetContext.Provider>
  );
}
