import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_HERO_SLIDES, type HeroSlideVM } from "@/lib/hero-public";
import { parseHeroTransition, type HeroTransitionId } from "@/lib/hero-transition";

export async function getHeroCarouselSettings(): Promise<{ transition: HeroTransitionId }> {
  try {
    const row = await prisma.heroCarouselSettings.findUnique({ where: { id: "default" } });
    return { transition: parseHeroTransition(row?.transition) };
  } catch {
    return { transition: "wipe" };
  }
}

export async function getHeroSlidesForSite(): Promise<HeroSlideVM[]> {
  try {
    const rows = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });
    if (rows.length === 0) return DEFAULT_HERO_SLIDES;
    return rows.map((r) => ({
      label: r.eyebrow || "Magenta Crown",
      line1: r.line1,
      accent: r.accent,
      sub: [r.sub1 || "", r.sub2 || ""].filter(Boolean),
      bg: r.imageUrl,
      imagePosition: r.imagePosition?.trim() || "center"
    }));
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getHeroSlidesForSite] Database unreachable — using built-in hero slides.");
    }
    return DEFAULT_HERO_SLIDES;
  }
}
