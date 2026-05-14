"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BreathingLogoMark } from "@/components/layout/BreathingLogoMark";
import { clearLoaderChromeFromDocument, removeBootScrim } from "@/lib/loader-dom-cleanup";
import { MC_LOADER_MAROON } from "@/lib/loader-theme";
import { pushHideSiteChrome, popHideSiteChrome } from "@/lib/site-chrome-loader-depth";
import { useMcLoaderFixedBox } from "@/lib/use-mc-loader-fixed-box";

type Props = {
  heroReady: boolean;
  markHeroReady: () => void;
  loaderLogoSrc?: string;
};

export function GlobalPageLoader({ heroReady, markHeroReady, loaderLogoSrc }: Props) {
  const pathname = usePathname();

  const [surfaceReady] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (heroReady && pathname === "/") {
      clearLoaderChromeFromDocument();
    }
  }, [heroReady, pathname]);

  useEffect(() => {
    if (pathname === "/") return;
    clearLoaderChromeFromDocument();
  }, [pathname]);

  const showHeroOverlay = surfaceReady && pathname === "/" && !heroReady;

  useEffect(() => {
    if (showHeroOverlay) {
      setShowOverlay(true);
      return;
    }
    const t = window.setTimeout(() => setShowOverlay(false), 220);
    return () => window.clearTimeout(t);
  }, [showHeroOverlay]);

  /** Never trap the shell if hero signals stall (mirrors provider fallback, belt-and-suspenders). */
  useEffect(() => {
    if (!showHeroOverlay) return;
    const safety = window.setTimeout(() => {
      markHeroReady();
      clearLoaderChromeFromDocument();
    }, 1800);
    return () => window.clearTimeout(safety);
  }, [showHeroOverlay, markHeroReady]);

  useLayoutEffect(() => {
    if (!showHeroOverlay) return;
    document.body.style.backgroundColor = MC_LOADER_MAROON;
    document.documentElement.style.backgroundColor = MC_LOADER_MAROON;
    return () => {
      document.body.style.removeProperty("background-color");
      document.documentElement.style.removeProperty("background-color");
    };
  }, [showHeroOverlay]);

  useLayoutEffect(() => {
    if (showHeroOverlay) {
      pushHideSiteChrome();
      return () => popHideSiteChrome();
    }
    return;
  }, [showHeroOverlay]);

  const screenBox = useMcLoaderFixedBox(showOverlay);

  useLayoutEffect(() => {
    removeBootScrim();
  }, [showHeroOverlay]);

  useLayoutEffect(() => {
    return () => {
      removeBootScrim();
    };
  }, []);

  const portalNode = showOverlay ? (
    <div
      key="hero-shell"
      className={`pointer-events-none flex flex-col items-center justify-center px-6 transition-opacity duration-200 ${
        showHeroOverlay ? "opacity-100" : "opacity-0"
      }`}
      style={{
        ...screenBox,
        backgroundColor: MC_LOADER_MAROON
      }}
    >
      <div className="relative flex flex-col items-center justify-center">
        <BreathingLogoMark
          homeIntroBreath
          competeWithHeroLcp
          logoSrc={loaderLogoSrc}
          sizeClassName="h-[min(42vw,12.5rem)] w-[min(42vw,12.5rem)] sm:h-52 sm:w-52"
          imageSizes="(max-width: 640px) 50vw, 208px"
        />
      </div>
    </div>
  ) : null;

  if (!isClient || !surfaceReady || typeof document === "undefined") {
    return null;
  }

  return <>{createPortal(portalNode, document.body)}</>;
}
