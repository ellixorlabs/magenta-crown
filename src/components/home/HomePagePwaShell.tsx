"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HomePageView } from "@/components/home/HomePageView";
import type { ProductRow } from "@/lib/db/app-types";
import {
  clearInstantHomeFlag,
  markLeftHome,
  readHomePageClientCache,
  shouldShowInstantHomeCache,
  writeHomePageClientCache,
  type SerializedHomeBundle
} from "@/lib/home-page-client-cache";
import { isPWA } from "@/lib/isPWA";

type HomeProductRow = ProductRow & { variants?: { stock: number; isActive: boolean }[] };

export function HomePagePwaShell({
  snapshot,
  children
}: {
  snapshot: SerializedHomeBundle;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const wasHome = useRef(pathname === "/");
  const liveRef = useRef<HTMLDivElement>(null);
  const [showCache, setShowCache] = useState(false);

  useEffect(() => {
    writeHomePageClientCache(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (pathname !== "/" && wasHome.current) {
      markLeftHome();
    }
    wasHome.current = pathname === "/";
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      setShowCache(false);
      return;
    }
    setShowCache(isPWA() && shouldShowInstantHomeCache());
  }, [pathname]);

  useEffect(() => {
    if (!showCache || !liveRef.current) return;
    const el = liveRef.current;
    const swap = () => {
      if (el.childElementCount > 0) {
        setShowCache(false);
        clearInstantHomeFlag();
      }
    };
    swap();
    const obs = new MutationObserver(swap);
    obs.observe(el, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [showCache, children]);

  const cached = readHomePageClientCache() ?? snapshot;
  const productById = new Map(cached.productByIdEntries) as Map<string, HomeProductRow>;

  return (
    <>
      {showCache && pathname === "/" ? (
        <HomePageView
          payload={cached.payload}
          heroSlides={cached.heroSlides}
          heroTransition={cached.heroCarousel.transition}
          wishlistIds={new Set()}
          productById={productById}
          homePageBanners={cached.homePageBanners}
        />
      ) : null}
      <div ref={liveRef} className={showCache && pathname === "/" ? "hidden" : undefined} aria-hidden={showCache}>
        {children}
      </div>
    </>
  );
}
