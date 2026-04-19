"use client";

import { useLayoutEffect } from "react";
import { useHeroReady } from "@/context/HeroReadyContext";

/** When the homepage has no hero section, dismiss the full-screen logo loader immediately. */
export function HomeHeroReadyBridge({ hasHero }: { hasHero: boolean }) {
  const { markHeroReady } = useHeroReady();

  useLayoutEffect(() => {
    if (!hasHero) markHeroReady();
  }, [hasHero, markHeroReady]);

  return null;
}
