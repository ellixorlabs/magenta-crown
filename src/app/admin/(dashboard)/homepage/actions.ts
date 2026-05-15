"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { clearCache } from "@/lib/cache";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { HomePageBannerRow } from "@/lib/home-page-banner";
import type { DynamicHomeSection, DynamicProductSection, HomePagePayloadV2 } from "@/lib/home-page-types";
import { pickAuthVisualUrl } from "@/lib/auth-visual-pick";
import { parseHomePageConfigPayload } from "@/lib/home-page-config-payload";
import { HOMEPAGE_BUNDLE_CACHE_KEY } from "@/services/home/home.service";

function isPayloadV2(x: unknown): x is HomePagePayloadV2 {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (o.version !== 2) return false;
  if (typeof o.hero !== "object" || o.hero === null) return false;
  const h = o.hero as Record<string, unknown>;
  if (typeof h.enabled !== "boolean") return false;
  if (typeof o.categoryCircles !== "object" || o.categoryCircles === null) return false;
  const cc = o.categoryCircles as Record<string, unknown>;
  if (typeof cc.enabled !== "boolean") return false;
  if (typeof cc.eyebrow !== "string") return false;
  if (typeof cc.title !== "string") return false;
  if (cc.shape !== "circle" && cc.shape !== "square" && cc.shape !== "rectangle") return false;
  if (!Array.isArray(cc.items)) return false;
  for (const it of cc.items) {
    if (typeof it !== "object" || it === null) return false;
    const i = it as Record<string, unknown>;
    if (typeof i.id !== "string") return false;
    if (typeof i.label !== "string") return false;
    if (typeof i.imageUrl !== "string") return false;
    if (i.targetType !== "category" && i.targetType !== "shopFilter" && i.targetType !== "customUrl") return false;
    if (typeof i.targetValue !== "string") return false;
  }
  if (!Array.isArray(o.sections)) return false;
  for (const s of o.sections) {
    if (typeof s !== "object" || s === null) return false;
    const sec = s as Record<string, unknown>;
    if (typeof sec.id !== "string" || !sec.id.trim()) return false;
    if (
      sec.type !== "carousel" &&
      sec.type !== "grid" &&
      sec.type !== "promoBanner" &&
      sec.type !== "bannerCarousel"
    ) {
      return false;
    }
    if (typeof sec.enabled !== "boolean") return false;
    if (typeof sec.order !== "number" || !Number.isFinite(sec.order)) return false;
    if (sec.transition !== "fade" && sec.transition !== "slide" && sec.transition !== "zoom" && sec.transition !== "none") {
      return false;
    }
    if (sec.type === "bannerCarousel") {
      if (typeof sec.order !== "number" || !Number.isFinite(sec.order)) return false;
      continue;
    }
    if (sec.type === "promoBanner") {
      if (typeof sec.title !== "string") return false;
      if (sec.subtitle != null && typeof sec.subtitle !== "string") return false;
      if (typeof sec.imageUrl !== "string") return false;
      if (typeof sec.targetHref !== "string") return false;
      if (typeof sec.gradientFrom !== "string") return false;
      if (typeof sec.gradientTo !== "string") return false;
      continue;
    }
    if (typeof sec.title !== "string") return false;
    if (typeof sec.eyebrow !== "string") return false;
    if (!Array.isArray(sec.productIds)) return false;
    if (!sec.productIds.every((id) => typeof id === "string")) return false;
    if (sec.viewAllHref != null && typeof sec.viewAllHref !== "string") return false;
  }
  return true;
}

function normalizePayloadV2(p: HomePagePayloadV2): HomePagePayloadV2 {
  const sorted = [...p.sections].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const sections: DynamicHomeSection[] = sorted.map((s, i) => {
    if (s.type === "bannerCarousel") {
      return { ...s, order: i };
    }
    if (s.type === "promoBanner") {
      return {
        ...s,
        order: i,
        title: s.title.trim() || "Promo banner",
        subtitle: s.subtitle?.trim() || undefined,
        imageUrl: s.imageUrl.trim(),
        targetHref: s.targetHref.trim() || "/shop",
        gradientFrom: s.gradientFrom.trim() || "#7f1530",
        gradientTo: s.gradientTo.trim() || "#c02b56"
      };
    }
    const ps = s as DynamicProductSection;
    const productSection: DynamicProductSection = {
      ...ps,
      order: i,
      title: ps.title.trim() || "Untitled",
      eyebrow: ps.eyebrow.trim(),
      productIds: [...new Set(ps.productIds.filter(Boolean))]
    };
    return productSection;
  });
  return {
    version: 2,
    hero: { enabled: p.hero.enabled },
    categoryCircles: {
      enabled: p.categoryCircles.enabled,
      eyebrow: p.categoryCircles.eyebrow.trim(),
      title: p.categoryCircles.title.trim(),
      shape: p.categoryCircles.shape,
      items: p.categoryCircles.items.slice(0, 12).map((it) => ({
        id: it.id.trim(),
        label: it.label.trim(),
        imageUrl: it.imageUrl.trim(),
        targetType: it.targetType,
        targetValue: it.targetValue.trim()
      }))
    },
    sections
  };
}

export async function saveHomePageConfig(payload: unknown) {
  await requireMerchAdmin("/admin/homepage");
  if (!isPayloadV2(payload)) {
    throw new Error("Invalid homepage config: expected version 2 with hero + sections.");
  }

  const normalized = normalizePayloadV2(payload);
  const nowIso = new Date().toISOString();

  const supabase = getSupabaseServiceRoleClient();
  const { data: existingRow } = await (supabase.from("HomePageConfig") as any)
    .select("payload")
    .eq("id", "default")
    .maybeSingle();
  const existingPayload = parseHomePageConfigPayload(existingRow?.payload);
  const incomingAuthUrl = pickAuthVisualUrl(payload as Record<string, unknown>);
  /** Preserve keys not edited by homepage CMS (auth visual, brand assets, etc.). */
  const mergedPayload = { ...existingPayload, ...normalized } as Record<string, unknown>;
  const existingAuthUrl = pickAuthVisualUrl(existingPayload);
  if (incomingAuthUrl) mergedPayload.authVisualImageUrl = incomingAuthUrl;
  else if (!pickAuthVisualUrl(mergedPayload) && existingAuthUrl) mergedPayload.authVisualImageUrl = existingAuthUrl;

  const { error } = await (supabase.from("HomePageConfig") as any).upsert({
    id: "default",
    payload: mergedPayload as object,
    updatedAt: nowIso
  });
  if (error) throw new Error(error.message);

  clearCache(HOMEPAGE_BUNDLE_CACHE_KEY);
  revalidateTag("auth-visual-url", "max");
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}

function isHomePageBannerRow(x: unknown): x is HomePageBannerRow {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.trim().length > 0 &&
    typeof o.desktopImageUrl === "string" &&
    typeof o.mobileImageUrl === "string" &&
    typeof o.redirectUrl === "string" &&
    typeof o.title === "string" &&
    typeof o.isVisible === "boolean"
  );
}

export async function saveHomePageBanners(rows: unknown) {
  await requireMerchAdmin("/admin/homepage");
  if (!Array.isArray(rows) || rows.length > 48 || !rows.every(isHomePageBannerRow)) {
    throw new Error("Invalid banners payload.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const incomingIds = rows.map((r) => r.id);
  const { data: existing, error: selErr } = await (supabase.from("HomePageBanner") as any).select("id");
  if (selErr) throw new Error(selErr.message);
  const orphanIds = ((existing ?? []) as { id: string }[])
    .map((r) => r.id)
    .filter((id) => !incomingIds.includes(id));
  if (orphanIds.length) {
    const { error: delErr } = await (supabase.from("HomePageBanner") as any).delete().in("id", orphanIds);
    if (delErr) throw new Error(delErr.message);
  }

  const upserts = rows.map((r, i) => ({
    id: r.id.trim(),
    desktopImageUrl: r.desktopImageUrl.trim(),
    mobileImageUrl: r.mobileImageUrl.trim(),
    redirectUrl: (r.redirectUrl.trim() || "/shop").slice(0, 2048),
    title: (r.title.trim() || "Banner").slice(0, 200),
    sortOrder: i,
    isVisible: r.isVisible,
    updatedAt: now,
    createdAt: r.createdAt && typeof r.createdAt === "string" ? r.createdAt : now
  }));

  const { error: upErr } = await (supabase.from("HomePageBanner") as any).upsert(upserts, { onConflict: "id" });
  if (upErr) throw new Error(upErr.message);

  clearCache(HOMEPAGE_BUNDLE_CACHE_KEY);
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}
