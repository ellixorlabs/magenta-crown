"use client";

import { usePathname } from "next/navigation";

const shopShell = "min-h-[100dvh] w-full bg-[#f4f0f2]";

/**
 * `(site)` segment loading while RSC streams.
 * Homepage intro is owned only by `GlobalPageLoader`. Other routes use a light shell so
 * route-level `loading.tsx` skeletons read as the primary loading UI.
 */
export function SiteSegmentLoading() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  if (pathname === "/shop" || pathname.startsWith("/shop")) {
    return <div className={shopShell} aria-hidden />;
  }

  return <div className={`${shopShell} py-12`} aria-hidden />;
}
