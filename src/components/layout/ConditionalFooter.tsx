"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/features/Footer";
import { useHeroReady } from "@/context/HeroReadyContext";

export function ConditionalFooter() {
  const pathname = usePathname();
  const { heroReady } = useHeroReady();

  if (pathname === "/auth/signin" || pathname === "/auth/signup") {
    return null;
  }

  /** Hide until hero reports ready — avoids footer flashing above the fold before the full-screen loader hydrates. */
  if (pathname === "/" && !heroReady) {
    return null;
  }

  return <Footer />;
}
