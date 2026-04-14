import { prisma } from "@/lib/prisma";
import { parseHeroTransition, type HeroTransitionId } from "@/lib/hero-transition";

export type HeroSlideVM = {
  label: string;
  line1: string;
  accent: string;
  sub: string[];
  bg: string;
  /** CSS object-position for hero background image */
  imagePosition: string;
};

export const DEFAULT_HERO_SLIDES: HeroSlideVM[] = [
  {
    label: "New collection • Spring 2026",
    line1: "The Language",
    accent: "of Elegance",
    sub: [
      "Where couture craftsmanship meets contemporary vision.",
      "Each piece a testament to artisan mastery."
    ],
    bg: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1920&q=80",
    imagePosition: "center"
  },
  {
    label: "Festive luminance",
    line1: "Crafted to",
    accent: "Shine",
    sub: [
      "Jewel tones and hand embroidery for the season’s grandest nights.",
      "Limited atelier drops — never mass-produced."
    ],
    bg: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1920&q=80",
    imagePosition: "center"
  },
  {
    label: "Modern heritage",
    line1: "Silhouettes",
    accent: "Reimagined",
    sub: [
      "Architectural drapes with soulful texture.",
      "Designed for movement, built to last."
    ],
    bg: "https://images.unsplash.com/photo-1604147495798-57beb5d6af73?auto=format&fit=crop&w=1920&q=80",
    imagePosition: "center"
  }
];

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
