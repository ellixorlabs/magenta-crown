import type { HomePageBannerRow } from "@/lib/home-page-banner";
import type { HeroTransitionId } from "@/lib/hero-transition";
import type { HeroSlideVM } from "@/lib/hero-public";
import type { HomePagePayloadV2 } from "@/lib/home-page-types";

export const HOME_PAGE_CLIENT_CACHE_KEY = "mc-home-bundle-v1";
const HOME_LEFT_KEY = "mc-left-home";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SerializedHomeBundle = {
  payload: HomePagePayloadV2;
  heroSlides: HeroSlideVM[];
  heroCarousel: { transition: HeroTransitionId };
  productByIdEntries: [string, unknown][];
  homePageBanners: HomePageBannerRow[];
  savedAt: number;
};

export function serializeHomeBundle(bundle: {
  payload: HomePagePayloadV2;
  heroSlides: HeroSlideVM[];
  heroCarousel: { transition: HeroTransitionId };
  productById: Map<string, unknown>;
  homePageBanners: HomePageBannerRow[];
}): SerializedHomeBundle {
  return {
    payload: bundle.payload,
    heroSlides: bundle.heroSlides,
    heroCarousel: bundle.heroCarousel,
    productByIdEntries: [...bundle.productById.entries()],
    homePageBanners: bundle.homePageBanners,
    savedAt: Date.now()
  };
}

export function writeHomePageClientCache(snapshot: SerializedHomeBundle) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HOME_PAGE_CLIENT_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

export function readHomePageClientCache(): SerializedHomeBundle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HOME_PAGE_CLIENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SerializedHomeBundle;
    if (!parsed?.payload || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function markLeftHome() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(HOME_LEFT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowInstantHomeCache(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(HOME_LEFT_KEY) === "1" && !!readHomePageClientCache();
  } catch {
    return false;
  }
}

export function clearInstantHomeFlag() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(HOME_LEFT_KEY);
  } catch {
    /* ignore */
  }
}
