"use client";

import { usePathname } from "next/navigation";
import { BreathingLogoMark } from "@/components/layout/BreathingLogoMark";

const shopShell = "min-h-[40vh] w-full bg-[#f4f0f2]";

/**
 * `(site)` segment loading while RSC streams.
 * Avoid heavy skeletons / breathing mark on in-app navigations — those feel like the app stalled.
 * Homepage first paint still uses the mark until hero is ready (paired with GlobalPageLoader).
 */
export function SiteSegmentLoading() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <div className={`flex ${shopShell} items-center justify-center py-16`}>
        <BreathingLogoMark />
      </div>
    );
  }

  if (pathname.startsWith("/shop")) {
    return <div className={shopShell} aria-busy="true" />;
  }

  return <div className={`${shopShell} py-12`} aria-busy="true" />;
}
