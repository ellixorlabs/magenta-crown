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
  const isAuthImmersive = pathname.startsWith("/auth/");
  const isAccountArea = pathname.startsWith("/account/");

  const skipTopPad = isHome || isAuthImmersive;
  const shellBg = isAccountArea ? "bg-[#f8f5f6]" : "bg-white";

  useEffect(() => {
    if (pathname === "/") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname]);

  return (
    <div
      className={`relative z-0 min-w-0 ${shellBg} ${skipTopPad ? "" : "pt-[7.5rem] sm:pt-[8rem]"}`}
    >
      {children}
    </div>
  );
}
