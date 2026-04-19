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

type SheetCtx = { openFilters: () => void };

const ShopFilterSheetContext = createContext<SheetCtx | null>(null);

export function useShopFilterSheet(): SheetCtx {
  const v = useContext(ShopFilterSheetContext);
  if (!v) throw new Error("useShopFilterSheet must be used within ShopFilterSheetProvider");
  return v;
}

type SheetProps = ComponentProps<typeof ShopFiltersMobileSheet>;

export function ShopFilterSheetProvider({
  children,
  ...sheetProps
}: SheetProps & { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openFilters = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openFilters }), [openFilters]);

  return (
    <ShopFilterSheetContext.Provider value={value}>
      {children}
      <ShopFiltersMobileSheet
        {...sheetProps}
        hideTrigger
        open={open}
        onOpenChange={setOpen}
        omitSortInSheet
      />
    </ShopFilterSheetContext.Provider>
  );
}
