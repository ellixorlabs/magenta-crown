"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

type ShopContextValue = {
  /** Active browse filter (e.g. occasion slug or category id). */
  activeFilter: string | null;
  setActiveFilter: (value: string | null) => void;
  /** Quick search string shared across shop surfaces (navbar can wire later). */
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [activeFilter, setActiveFilterState] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState("");

  const setActiveFilter = useCallback((value: string | null) => {
    setActiveFilterState(value);
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q);
  }, []);

  const value = useMemo<ShopContextValue>(
    () => ({
      activeFilter,
      setActiveFilter,
      searchQuery,
      setSearchQuery
    }),
    [activeFilter, searchQuery, setActiveFilter, setSearchQuery]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within ShopProvider");
  }
  return context;
}
