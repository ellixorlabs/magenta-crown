import type {
  BannerCarouselSectionConfig,
  DynamicPromoBannerSection,
  HomePagePayloadV2
} from "@/lib/home-page-types";
import { pickAuthVisualUrl } from "@/lib/auth-visual-pick";
import { parseHomePageConfigPayload } from "@/lib/home-page-config-payload";
import { randomId } from "@/lib/random-id";

export type HomePageBannerRow = {
  id: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  redirectUrl: string;
  title: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type HomePageBannerInput = Omit<HomePageBannerRow, "createdAt" | "updatedAt" | "sortOrder"> & {
  sortOrder?: number;
};

/** Storefront + carousel: one row per slide. */
export type HomePageBannerDisplay = {
  id: string;
  title: string;
  subtitle?: string;
  desktopImage: string;
  mobileImage: string;
  redirectUrl: string;
};

export function rowsToDisplay(rows: HomePageBannerRow[]): HomePageBannerDisplay[] {
  return rows
    .filter((r) => r.isVisible && (r.desktopImageUrl.trim() || r.mobileImageUrl.trim()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((r) => ({
      id: r.id,
      title: r.title.trim() || "Featured",
      desktopImage: r.desktopImageUrl.trim() || r.mobileImageUrl.trim(),
      mobileImage: r.mobileImageUrl.trim() || r.desktopImageUrl.trim(),
      redirectUrl: r.redirectUrl.trim() || "/shop"
    }));
}

export function legacyPromoSectionsToDisplay(sections: HomePagePayloadV2["sections"]): HomePageBannerDisplay[] {
  const promos = sections.filter((s): s is DynamicPromoBannerSection => s.type === "promoBanner" && s.enabled);
  return promos
    .filter((s) => (s.imageUrlDesktop || s.imageUrlMobile || s.imageUrl)?.trim())
    .map((s) => {
      const desktop = (s.imageUrlDesktop || s.imageUrl || s.imageUrlMobile || "").trim();
      const mobile = (s.imageUrlMobile || s.imageUrl || s.imageUrlDesktop || "").trim();
      return {
        id: s.id,
        title: s.title.trim() || "Featured",
        subtitle: s.subtitle?.trim() || undefined,
        desktopImage: desktop || mobile,
        mobileImage: mobile || desktop,
        redirectUrl: s.targetHref.trim() || "/shop"
      };
    });
}

/** First enabled section that owns the single homepage promo carousel slot (same ordering as storefront). */
export function firstHomeBannerSlotSection(
  sections: HomePagePayloadV2["sections"]
): BannerCarouselSectionConfig | DynamicPromoBannerSection | undefined {
  const sorted = [...sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return sorted.find((s): s is BannerCarouselSectionConfig | DynamicPromoBannerSection =>
    s.type === "bannerCarousel" || s.type === "promoBanner"
  );
}

/**
 * Resolves which creatives power the storefront carousel.
 * When the layout slot is still legacy `promoBanner`, use JSON image URLs — not `HomePageBanner` rows — so
 * merchandising edits there are not shadowed by older DB slides left over from migration.
 */
export function resolveHomePageBanners(
  rows: HomePageBannerRow[],
  payload: HomePagePayloadV2
): HomePageBannerDisplay[] {
  const slot = firstHomeBannerSlotSection(payload.sections);
  if (slot?.type === "promoBanner") {
    return legacyPromoSectionsToDisplay(payload.sections);
  }
  const fromDb = rowsToDisplay(rows);
  if (fromDb.length > 0) return fromDb;
  return legacyPromoSectionsToDisplay(payload.sections);
}

export function firstBannerSectionIndex(sections: HomePagePayloadV2["sections"]): number {
  const sorted = [...sections].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return sorted.findIndex((s) => s.type === "bannerCarousel" || s.type === "promoBanner");
}

function toBannerCarouselSection(promo: DynamicPromoBannerSection): BannerCarouselSectionConfig {
  return {
    id: promo.id,
    type: "bannerCarousel",
    enabled: promo.enabled,
    order: promo.order,
    transition: promo.transition
  };
}

/** Replace legacy promo sections with a single `bannerCarousel` at the earliest promo slot. */
export function stripPromoSectionsToBannerCarousel(payload: HomePagePayloadV2): HomePagePayloadV2 {
  const sorted = [...payload.sections].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const firstIdx = sorted.findIndex((s) => s.type === "promoBanner");
  if (firstIdx < 0) return payload;
  const anchor = sorted[firstIdx] as DynamicPromoBannerSection;
  const rest = sorted.filter((s) => s.type !== "promoBanner");
  if (rest.some((s) => s.type === "bannerCarousel")) {
    return { ...payload, sections: rest.map((s, i) => ({ ...s, order: i })) as HomePagePayloadV2["sections"] };
  }
  const replacement = toBannerCarouselSection(anchor);
  const before = sorted.slice(0, firstIdx).filter((s) => s.type !== "promoBanner").length;
  const merged = [...rest.slice(0, before), replacement, ...rest.slice(before)];
  return { ...payload, sections: merged.map((s, i) => ({ ...s, order: i })) as HomePagePayloadV2["sections"] };
}

/**
 * When legacy `promoBanner` JSON exists: copy creatives into `HomePageBanner` once, then normalize payload.
 * If banners already exist, only strips legacy promo sections from JSON (no duplicate rows).
 */
export async function migrateLegacyPromoBannersIfNeeded(
  supabase: { from: (t: string) => any },
  payload: HomePagePayloadV2
): Promise<HomePagePayloadV2> {
  const hasPromo = payload.sections.some((s) => s.type === "promoBanner");
  if (!hasPromo) return payload;

  const { count, error: countErr } = await supabase.from("HomePageBanner").select("*", { count: "exact", head: true });
  if (countErr) throw new Error(countErr.message);
  const existing = count ?? 0;

  const { data: cfgRow } = await (supabase.from("HomePageConfig") as any)
    .select("payload")
    .eq("id", "default")
    .maybeSingle();
  const existingPayload = parseHomePageConfigPayload(cfgRow?.payload);

  const mergeHomePageConfigPayload = (next: HomePagePayloadV2): object => {
    const merged = { ...existingPayload, ...next } as Record<string, unknown>;
    const prevAuth = pickAuthVisualUrl(existingPayload);
    if (!pickAuthVisualUrl(merged) && prevAuth) merged.authVisualImageUrl = prevAuth;
    return merged as object;
  };

  if (existing > 0) {
    const stripped = stripPromoSectionsToBannerCarousel(payload);
    if (stripped === payload) return payload;
    const nowIso = new Date().toISOString();
    const { error } = await (supabase.from("HomePageConfig") as any).upsert({
      id: "default",
      payload: mergeHomePageConfigPayload(stripped),
      updatedAt: nowIso
    });
    if (error) throw new Error(error.message);
    return stripped;
  }

  const promos = payload.sections
    .filter((s): s is DynamicPromoBannerSection => s.type === "promoBanner")
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  const now = new Date().toISOString();
  const rows = promos.map((p, i) => ({
    id: p.id,
    desktopImageUrl: (p.imageUrlDesktop || p.imageUrl || "").trim(),
    mobileImageUrl: (p.imageUrlMobile || p.imageUrl || "").trim(),
    redirectUrl: (p.targetHref || "/shop").trim() || "/shop",
    title: (p.title || "Banner").trim() || "Banner",
    sortOrder: i,
    isVisible: p.enabled,
    createdAt: now,
    updatedAt: now
  }));

  if (rows.some((r) => r.desktopImageUrl || r.mobileImageUrl)) {
    const { error: insErr } = await (supabase.from("HomePageBanner") as any).insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  const nextPayload = stripPromoSectionsToBannerCarousel(payload);
  const { error: cfgErr } = await (supabase.from("HomePageConfig") as any).upsert({
    id: "default",
    payload: mergeHomePageConfigPayload(nextPayload),
    updatedAt: now
  });
  if (cfgErr) throw new Error(cfgErr.message);
  return nextPayload;
}

export function createEmptyHomePageBanner(): HomePageBannerRow {
  return {
    id: `banner-${randomId()}`,
    desktopImageUrl: "",
    mobileImageUrl: "",
    redirectUrl: "/shop",
    title: "New banner",
    sortOrder: 0,
    isVisible: true
  };
}
