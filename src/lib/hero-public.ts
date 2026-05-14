/**
 * Hero types + static defaults — safe for `"use client"` (no DB / no Prisma).
 * Async DB-backed hero loading lives in `hero-data.ts` (server-only).
 */

export type HeroSlideVM = {
  label: string;
  line1: string;
  accent: string;
  sub: string[];
  bg: string;
  bgMobile?: string;
  bgDesktop?: string;
  /** CSS object-position for hero background image */
  imagePosition: string;
};

/** Stable React key / identity for a slide (survives reorder; not index-based). */
export function heroSlideStableKey(s: HeroSlideVM): string {
  return `${s.bg}|${s.bgMobile ?? ""}|${s.bgDesktop ?? ""}|${s.label}|${s.line1}`;
}

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
    bgMobile: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=900&q=80",
    bgDesktop: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1920&q=80",
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
    bgMobile: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=900&q=80",
    bgDesktop: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1920&q=80",
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
    bgMobile: "https://images.unsplash.com/photo-1604147495798-57beb5d6af73?auto=format&fit=crop&w=900&q=80",
    bgDesktop: "https://images.unsplash.com/photo-1604147495798-57beb5d6af73?auto=format&fit=crop&w=1920&q=80",
    imagePosition: "center"
  }
];
