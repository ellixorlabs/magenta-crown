import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { DEFAULT_HERO_SLIDES, type HeroSlideVM } from "@/lib/hero-public";
import { parseHeroTransition, type HeroTransitionId } from "@/lib/hero-transition";

function trimUrl(s: string | null | undefined): string {
  return (s ?? "").trim();
}

/** Prefer https for hosts where http is commonly mis-pasted; keeps image fetches happy. */
function normalizeImageUrl(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (
    u.startsWith("http://") &&
    (u.includes("supabase.co") || u.includes("supabase.in") || u.includes("unsplash.com"))
  ) {
    return `https://${u.slice("http://".length)}`;
  }
  return u;
}

function mapRowToSlide(r: {
  eyebrow: string | null;
  line1: string;
  accent: string;
  sub1: string | null;
  sub2: string | null;
  imageUrl: string | null;
  imageUrlMobile: string | null;
  imageUrlDesktop: string | null;
  imagePosition: string | null;
}): HeroSlideVM | null {
  const base = normalizeImageUrl(trimUrl(r.imageUrl));
  const rawM = normalizeImageUrl(trimUrl(r.imageUrlMobile));
  const rawD = normalizeImageUrl(trimUrl(r.imageUrlDesktop));
  const bg = base || rawD || rawM;
  if (!bg) return null;
  const bgMobile = rawM || bg;
  const bgDesktop = rawD || bg;
  return {
    label: r.eyebrow || "Magenta Crown",
    line1: r.line1,
    accent: r.accent,
    sub: [r.sub1 || "", r.sub2 || ""].filter(Boolean),
    bg,
    bgMobile,
    bgDesktop,
    imagePosition: r.imagePosition?.trim() || "center"
  };
}

export async function getHeroCarouselSettings(): Promise<{ transition: HeroTransitionId }> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data: row, error } = await (supabase.from("HeroCarouselSettings") as any)
      .select("transition")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { transition: parseHeroTransition(row?.transition) };
  } catch {
    return { transition: "wipe" };
  }
}

export async function getHeroSlidesForSite(): Promise<HeroSlideVM[]> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data: rows, error } = await (supabase.from("HeroSlide") as any)
      .select("eyebrow,line1,accent,sub1,sub2,imageUrl,imageUrlMobile,imageUrlDesktop,imagePosition")
      .eq("isActive", true)
      .order("sortOrder", { ascending: true });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<{
      eyebrow: string | null;
      line1: string;
      accent: string;
      sub1: string | null;
      sub2: string | null;
      imageUrl: string | null;
      imageUrlMobile: string | null;
      imageUrlDesktop: string | null;
      imagePosition: string | null;
    }>;
    if (list.length === 0) return DEFAULT_HERO_SLIDES;
    const mapped = list.map(mapRowToSlide).filter((s): s is HeroSlideVM => s != null);
    return mapped.length > 0 ? mapped : DEFAULT_HERO_SLIDES;
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getHeroSlidesForSite] Database unreachable — using built-in hero slides.");
    }
    return DEFAULT_HERO_SLIDES;
  }
}
