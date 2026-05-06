import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { DEFAULT_HERO_SLIDES, type HeroSlideVM } from "@/lib/hero-public";
import { parseHeroTransition, type HeroTransitionId } from "@/lib/hero-transition";

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
      imageUrl: string;
      imageUrlMobile: string | null;
      imageUrlDesktop: string | null;
      imagePosition: string | null;
    }>;
    if (list.length === 0) return DEFAULT_HERO_SLIDES;
    return list.map((r) => ({
      label: r.eyebrow || "Magenta Crown",
      line1: r.line1,
      accent: r.accent,
      sub: [r.sub1 || "", r.sub2 || ""].filter(Boolean),
      bg: r.imageUrl,
      bgMobile: r.imageUrlMobile?.trim() || r.imageUrl,
      bgDesktop: r.imageUrlDesktop?.trim() || r.imageUrl,
      imagePosition: r.imagePosition?.trim() || "center"
    }));
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getHeroSlidesForSite] Database unreachable — using built-in hero slides.");
    }
    return DEFAULT_HERO_SLIDES;
  }
}
