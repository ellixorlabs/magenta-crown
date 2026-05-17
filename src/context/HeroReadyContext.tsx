"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { usePathname } from "next/navigation";
import { GlobalPageLoader } from "@/components/layout/GlobalPageLoader";
import { hasSeenAppIntro, markAppIntroSeen } from "@/lib/app-intro-session";
import { clearLoaderChromeFromDocument } from "@/lib/loader-dom-cleanup";

type HeroReadyContextValue = {
  heroReady: boolean;
  markHeroReady: () => void;
};

const HeroReadyContext = createContext<HeroReadyContextValue | null>(null);

/** If hero images stall (slow mobile/LAN, failed load, missing onLoad), never block the shell forever. */
/** If hero never signals ready (blocked assets, tunnel misconfig), unblock the shell quickly. */
const HERO_READY_FALLBACK_MS = 1400;

export function HeroReadyProvider({ children, loaderLogoSrc }: { children: ReactNode; loaderLogoSrc?: string }) {
  const pathname = usePathname();
  const [heroReady, setHeroReady] = useState(false);

  const markHeroReady = useCallback(() => {
    setHeroReady(true);
    markAppIntroSeen();
  }, []);

  useLayoutEffect(() => {
    if (hasSeenAppIntro()) {
      setHeroReady(true);
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/" || heroReady || hasSeenAppIntro()) return;
    const id = window.setTimeout(() => {
      markHeroReady();
    }, HERO_READY_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [pathname, heroReady, markHeroReady]);

  /** bfcache restore can leave maroon boot / `heroReady` stale — recover to a usable page. */
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      clearLoaderChromeFromDocument();
      setHeroReady(true);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
      {/** No Suspense wrapper: `useSearchParams` inside would suspend this subtree and strand the loader / body tint. */}
      <GlobalPageLoader heroReady={heroReady} markHeroReady={markHeroReady} loaderLogoSrc={loaderLogoSrc} />
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
