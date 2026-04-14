"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LOGO = "/branding/mc-logo.png";

/** Strict Mode remounts reset component refs; this avoids running the home intro twice. */
let homeIntroConsumedThisLoad = false;

export function GlobalPageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [heroIntro, setHeroIntro] = useState(false);
  const [slowNav, setSlowNav] = useState(false);

  const pendingNavRef = useRef(false);
  const slowTimerRef = useRef<number | null>(null);
  const prevPathRef = useRef<string | null>(null);

  /**
   * Breathing logo only when the app’s first client route is `/` (fresh load on home).
   * Client navigation from e.g. collections → `/` does not show it (`prev` is already set).
   */
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    if (pathname !== "/") {
      setHeroIntro(false);
      return;
    }

    if (prev !== null) {
      setHeroIntro(false);
      return;
    }

    if (homeIntroConsumedThisLoad) {
      setHeroIntro(false);
      return;
    }

    homeIntroConsumedThisLoad = true;
    setHeroIntro(true);
    const t = window.setTimeout(() => setHeroIntro(false), 3000);
    return () => window.clearTimeout(t);
  }, [pathname]);

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

      pendingNavRef.current = true;
      if (slowTimerRef.current != null) window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = window.setTimeout(() => {
        if (pendingNavRef.current) setSlowNav(true);
      }, 4000);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [pathname, searchParams]);

  const showHeroOverlay = heroIntro && pathname === "/";
  const showSlowOverlay = slowNav && !showHeroOverlay;

  return (
    <AnimatePresence>
      {(showHeroOverlay || showSlowOverlay) && (
        <motion.div
          key={showHeroOverlay ? "hero" : "slow"}
          className={`fixed inset-0 z-[200] flex items-center justify-center ${
            showHeroOverlay ? "pointer-events-none bg-white" : "bg-white/85 backdrop-blur-sm"
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative h-28 w-28 sm:h-40 sm:w-40"
          >
            <Image
              src={LOGO}
              alt="Magenta Crown"
              fill
              className="object-contain"
              sizes="(max-width: 640px) 112px, 160px"
              priority
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
