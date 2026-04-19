"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GlobalPageLoader } from "@/components/layout/GlobalPageLoader";

type HeroReadyContextValue = {
  heroReady: boolean;
  markHeroReady: () => void;
};

const HeroReadyContext = createContext<HeroReadyContextValue | null>(null);

/** If hero images stall (slow mobile/LAN, failed load, missing onLoad), never block the shell forever. */
/** If hero never signals ready (blocked assets, tunnel misconfig), unblock the shell quickly. */
const HERO_READY_FALLBACK_MS = 2800;

export function HeroReadyProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    if (pathname !== "/") {
      setHeroReady(false);
    }
  }, [pathname]);

  const markHeroReady = useCallback(() => {
    setHeroReady(true);
  }, []);

  useEffect(() => {
    if (pathname !== "/" || heroReady) return;
    const id = window.setTimeout(() => {
      markHeroReady();
    }, HERO_READY_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [pathname, heroReady, markHeroReady]);

  const value = useMemo(
    () => ({
      heroReady,
      markHeroReady
    }),
    [heroReady, markHeroReady]
  );

  return (
    <HeroReadyContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <GlobalPageLoader heroReady={heroReady} />
      </Suspense>
    </HeroReadyContext.Provider>
  );
}

export function useHeroReady() {
  const ctx = useContext(HeroReadyContext);
  if (!ctx) {
    throw new Error("useHeroReady must be used within HeroReadyProvider");
  }
  return ctx;
}
