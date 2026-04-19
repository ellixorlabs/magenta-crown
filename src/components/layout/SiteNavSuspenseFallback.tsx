"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BreathingLogoMark } from "@/components/layout/BreathingLogoMark";
import { SiteNavbarSkeleton } from "@/components/layout/SiteNavbarSkeleton";
import { useHeroReady } from "@/context/HeroReadyContext";

/**
 * While server nav data streams in. On `/` before the hero is ready, render nothing — only `GlobalPageLoader` should show the breathing logo.
 */
export function SiteNavSuspenseFallback() {
  const pathname = usePathname();
  const { heroReady } = useHeroReady();

  if (pathname === "/" && !heroReady) {
    return null;
  }

  if (pathname === "/") {
    return (
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[5000] flex justify-center px-4 pt-4 sm:px-6">
        <div className="section-shell flex w-full max-w-[1920px] items-center justify-center py-3">
          <Link href="/" className="pointer-events-auto shrink-0 opacity-90" aria-label="Magenta Crown home">
            <BreathingLogoMark sizeClassName="h-10 w-10 sm:h-11 sm:w-11" />
          </Link>
        </div>
      </header>
    );
  }

  return <SiteNavbarSkeleton />;
}
