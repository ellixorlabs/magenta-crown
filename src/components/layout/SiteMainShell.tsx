"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Adds top padding so the fixed navbar does not cover content.
 * Homepage only skips padding (immersive hero meets the header).
 */
export function SiteMainShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAuthImmersive = pathname === "/auth/signin" || pathname === "/auth/signup";

  const skipTopPad = isHome || isAuthImmersive;

  useEffect(() => {
    if (pathname === "/") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname]);

  return (
    <div
      className={`relative z-0 min-w-0 bg-[#f4f0f2] ${skipTopPad ? "" : "pt-[7.5rem] sm:pt-[8rem]"}`}
    >
      {children}
    </div>
  );
}
