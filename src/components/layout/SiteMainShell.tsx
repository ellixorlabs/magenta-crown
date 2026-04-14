"use client";

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

  return (
    <div className={skipTopPad ? "min-w-0" : "min-w-0 pt-[8.75rem] sm:pt-[9.25rem]"}>{children}</div>
  );
}
