"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BreathingLogoMark } from "@/components/layout/BreathingLogoMark";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

/** Once the home hero has reported ready, skip full-screen intro for the rest of this page load (Strict Mode safe). */
let homeHeroIntroDismissedThisLoad = false;

type Props = {
  /** Passed from HeroReadyProvider so this component does not call useHeroReady under Suspense (avoids context loss with useSearchParams). */
  heroReady: boolean;
};

export function GlobalPageLoader({ heroReady }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Avoid painting the full-screen hero overlay on SSR / before hydration (broken or blocked JS would trap users). */
  const [clientMounted, setClientMounted] = useState(false);
  const [slowNav, setSlowNav] = useState(false);

  const pendingNavRef = useRef(false);
  const slowTimerRef = useRef<number | null>(null);
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    setClientMounted(true);
  }, []);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    if (pathname !== "/") return;

    if (prev !== null && prev !== "/") {
      homeHeroIntroDismissedThisLoad = true;
    }
  }, [pathname]);

  useEffect(() => {
    if (heroReady && pathname === "/") {
      homeHeroIntroDismissedThisLoad = true;
    }
  }, [heroReady, pathname]);

  useEffect(() => {
    pendingNavRef.current = false;
    if (slowTimerRef.current != null) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    setSlowNav(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const curQs = searchParams.toString();

    const onClickCapture = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("a[href]");
      if (!el) return;
      const raw = el.getAttribute("href") ?? "";
      if (raw.startsWith("#")) return;
      if (!raw.startsWith("/") || raw.startsWith("//")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (el.getAttribute("target") === "_blank") return;

      const withoutHash = raw.split("#")[0] ?? raw;
      const [pathPart, queryPart = ""] = withoutHash.split("?");
      const normalizedQuery = queryPart ? `?${queryPart}` : "";
      const current = `${pathname}${curQs ? `?${curQs}` : ""}`;
      const target = `${pathPart}${normalizedQuery}`;
      if (target === current) return;

      /** Same pathname, new search only (e.g. /shop filters) — skip slow-route overlay. */
      if (pathPart === pathname) {
        return;
      }

      pendingNavRef.current = true;
      if (slowTimerRef.current != null) window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = window.setTimeout(() => {
        if (pendingNavRef.current) setSlowNav(true);
      }, 3200);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [pathname, searchParams]);

  const showHeroOverlay =
    clientMounted && pathname === "/" && !homeHeroIntroDismissedThisLoad && !heroReady;

  const showSlowOverlay = slowNav && !showHeroOverlay;

  /** Slow-route overlay is interactive — lock scroll without fighting other locks (ref-counted). */
  useEffect(() => {
    if (!showSlowOverlay) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [showSlowOverlay]);

  return (
    <AnimatePresence>
      {(showHeroOverlay || showSlowOverlay) && (
        <motion.div
          key={showHeroOverlay ? "hero" : "slow"}
          className={`fixed inset-0 z-[20000] flex min-h-[100dvh] w-full min-w-full flex-col items-center justify-center ${
            showHeroOverlay ? "pointer-events-none bg-white" : "bg-white/85 backdrop-blur-sm"
          }`}
          /** Hero overlay must be opaque on frame 1 — opacity 0 lets the body gradient show through (split-screen look). */
          initial={showHeroOverlay ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: showHeroOverlay ? 0 : 0.2 }}
        >
          <BreathingLogoMark />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
