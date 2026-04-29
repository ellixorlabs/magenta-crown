import "server-only";

import type { Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getHomePagePayload } from "@/lib/get-home-page-config";
import { getHeroCarouselSettings, getHeroSlidesForSite } from "@/lib/hero-data";
import type { HeroSlideVM } from "@/lib/hero-public";
import type { HomePagePayloadV2 } from "@/lib/home-page-types";
import type { HeroTransitionId } from "@/lib/hero-transition";
import { getCache, setCache } from "@/lib/cache";

type ProductRow = Product & { variants?: { stock: number; isActive: boolean }[] };

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

const CACHE_KEY = "homepage:bundle";
const TTL_MS = 60_000;

async function loadUncachedBundle(): Promise<HomePageDbBundle> {
  // Parallel public queries (CMS + hero), then fetch section products once IDs are known.
  const [payload, heroSlides, heroCarousel] = await Promise.all([
    getHomePagePayload(),
    getHeroSlidesForSite(),
    getHeroCarouselSettings()
  ]);

  const allIds = [...new Set(payload.sections.flatMap((s) => s.productIds).filter(Boolean))];

  let productById = new Map<string, ProductRow>();
  if (allIds.length > 0) {
    try {
      const rows = await prisma.product.findMany({
        where: { id: { in: allIds } },
        include: { variants: { select: { stock: true, isActive: true } } }
      });
      productById = new Map(rows.map((p) => [p.id, p]));
    } catch {
      productById = new Map();
    }
  }

  return { payload, heroSlides, heroCarousel, productById };
}

export async function getHomePageDbBundle(): Promise<HomePageDbBundle> {
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

