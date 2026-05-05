"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePwaStandalone } from "@/context/PwaStandaloneContext";

/**
 * Adds top padding so the fixed navbar does not cover content.
 * Homepage only skips padding (immersive hero meets the header).
 */
export function SiteMainShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isPwa = usePwaStandalone();
  const isHome = pathname === "/";
  const isAuthImmersive = pathname.startsWith("/auth/");
  const isAdmin = pathname.startsWith("/admin");

  const skipMarketingHeaderPad = isHome || isAuthImmersive;
  const topPadClass = skipMarketingHeaderPad
    ? ""
    : isPwa
      ? "pt-[max(0.75rem,env(safe-area-inset-top,0px))]"
      : "pt-[7.5rem] sm:pt-[8rem]";
  const shellBg = "bg-mc-cream";
  const bottomTabPad =
    isAuthImmersive || isAdmin ? "" : "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0";

  useEffect(() => {
    if (pathname === "/") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname]);

  return (
    <div
      className={`relative z-0 min-w-0 overflow-x-clip ${shellBg} ${topPadClass} ${bottomTabPad}`}
    >
      {children}
    </div>
  );
}
