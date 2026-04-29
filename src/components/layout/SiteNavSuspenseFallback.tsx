"use client";

import { usePathname } from "next/navigation";
import { SiteNavbarSkeleton } from "@/components/layout/SiteNavbarSkeleton";
import { useHeroReady } from "@/context/HeroReadyContext";

/**
 * While server nav data streams in.
 * On `/` before the hero is ready, render nothing — only `GlobalPageLoader` should show the breathing logo.
 * Everywhere else: a stable navbar skeleton (no full-viewport maroon overlay).
 */
export function SiteNavSuspenseFallback() {
  const pathname = usePathname();
  const { heroReady } = useHeroReady();

  if (pathname === "/" && !heroReady) {
    return null;
  }

  return <SiteNavbarSkeleton />;
}
