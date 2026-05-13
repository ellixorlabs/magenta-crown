import "server-only";

import { cache } from "react";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
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
};

type CachedHomeBundle = {
  payload: HomePagePayloadV2;
  heroSlides: HeroSlideVM[];
  heroCarousel: { transition: HeroTransitionId };
  productByIdEntries: [string, ProductRow][];
};

/** In-memory bundle key (must match `clearCache` in homepage CMS actions). */
export const CACHE_KEY = "homepage_db_bundle";

/** Alias for callers that imported the previous export name. */
export const HOMEPAGE_BUNDLE_CACHE_KEY = CACHE_KEY;

/** Homepage bundle TTL — keep in sync with product carousel freshness needs. */
const TTL_MS = 60_000;

async function loadUncachedBundle(): Promise<HomePageDbBundle> {
  // Parallel public queries (CMS + hero), then fetch section products once IDs are known.
  const [payload, heroSlides, heroCarousel] = await Promise.all([
    getHomePagePayload(),
    getHeroSlidesForSite(),
    getHeroCarouselSettings()
  ]);

  const allIds = [
    ...new Set(
      payload.sections
        .flatMap((s) => (s.type === "promoBanner" ? [] : s.productIds))
        .filter(Boolean)
    )
  ];

  let productById = new Map<string, ProductRow>();
  if (allIds.length > 0) {
    try {
      const supabase = getSupabaseServiceRoleClient();
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

  return { payload, heroSlides, heroCarousel, productById };
}

async function loadHomePageDbBundle(): Promise<HomePageDbBundle> {
  const hit = getCache<CachedHomeBundle>(CACHE_KEY);
  if (hit) {
    return {
      payload: hit.payload,
      heroSlides: hit.heroSlides,
      heroCarousel: hit.heroCarousel,
      productById: new Map(hit.productByIdEntries)
    };
  }

  const bundle = await loadUncachedBundle();
  const cached: CachedHomeBundle = {
    payload: bundle.payload,
    heroSlides: bundle.heroSlides,
    heroCarousel: bundle.heroCarousel,
    productByIdEntries: [...bundle.productById.entries()]
  };

  setCache(CACHE_KEY, cached, TTL_MS);

  return bundle;
}

/** Per-request dedupe via React `cache()` plus in-memory TTL above. */
export const getHomePageDbBundle = cache(loadHomePageDbBundle);

