import "server-only";

import { cache } from "react";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { HomePageBannerRow } from "@/lib/home-page-banner";
import { getHomePagePayload } from "@/lib/get-home-page-config";
import { getHeroCarouselSettings, getHeroSlidesForSite } from "@/lib/hero-data";
import type { HeroSlideVM } from "@/lib/hero-public";
import type { HomePagePayloadV2 } from "@/lib/home-page-types";
import type { HeroTransitionId } from "@/lib/hero-transition";
import { getCache, setCache } from "@/lib/cache";

type ProductRow = any;

export type HomePageDbBundle = {
  payload: HomePagePayloadV2;
  heroSlides: HeroSlideVM[];
  heroCarousel: { transition: HeroTransitionId };
  productById: Map<string, ProductRow>;
  homePageBanners: HomePageBannerRow[];
};

type CachedHomeBundle = {
  payload: HomePagePayloadV2;
  heroSlides: HeroSlideVM[];
  heroCarousel: { transition: HeroTransitionId };
  productByIdEntries: [string, ProductRow][];
  homePageBanners: HomePageBannerRow[];
};

/** In-memory bundle key (must match `clearCache` in homepage CMS actions). */
export const CACHE_KEY = "homepage_db_bundle";

/** Alias for callers that imported the previous export name. */
export const HOMEPAGE_BUNDLE_CACHE_KEY = CACHE_KEY;

/** Homepage bundle TTL — align with ISR-style freshness (non-auth data). */
const TTL_MS = 300_000;

async function loadUncachedBundle(): Promise<HomePageDbBundle> {
  const supabase = getSupabaseServiceRoleClient();
  const [payload, heroSlides, heroCarousel, bannerQuery] = await Promise.all([
    getHomePagePayload(),
    getHeroSlidesForSite(),
    getHeroCarouselSettings(),
    (supabase.from("HomePageBanner") as any)
      .select("*")
      .order("sortOrder", { ascending: true })
      .order("id", { ascending: true })
  ]);

  const allIds = [
    ...new Set(
      payload.sections
        .flatMap((s) => (s.type === "promoBanner" || s.type === "bannerCarousel" ? [] : s.productIds))
        .filter(Boolean)
    )
  ];

  let productById = new Map<string, ProductRow>();
  if (allIds.length > 0) {
    try {
      const { data: rows, error } = await (supabase.from("Product") as any)
        .select("*,variants:ProductVariant(stock,isActive)")
        .eq("status", "ACTIVE")
        .in("id", allIds);
      if (error) throw new Error(error.message);
      productById = new Map((rows ?? []).map((p: any) => [p.id, p]));
    } catch {
      productById = new Map();
    }
  }

  const { data: bannerData, error: bannerErr } = bannerQuery as {
    data: HomePageBannerRow[] | null;
    error: { message: string } | null;
  };
  const homePageBanners: HomePageBannerRow[] = !bannerErr && bannerData ? bannerData : [];

  return { payload, heroSlides, heroCarousel, productById, homePageBanners };
}

async function loadHomePageDbBundle(): Promise<HomePageDbBundle> {
  const hit = getCache<CachedHomeBundle>(CACHE_KEY);
  if (hit) {
    return {
      payload: hit.payload,
      heroSlides: hit.heroSlides,
      heroCarousel: hit.heroCarousel,
      productById: new Map(hit.productByIdEntries),
      homePageBanners: hit.homePageBanners
    };
  }

  const bundle = await loadUncachedBundle();
  const cached: CachedHomeBundle = {
    payload: bundle.payload,
    heroSlides: bundle.heroSlides,
    heroCarousel: bundle.heroCarousel,
    productByIdEntries: [...bundle.productById.entries()],
    homePageBanners: bundle.homePageBanners
  };

  setCache(CACHE_KEY, cached, TTL_MS);

  return bundle;
}

/** Per-request dedupe via React `cache()` plus in-memory TTL above. */
export const getHomePageDbBundle = cache(loadHomePageDbBundle);

