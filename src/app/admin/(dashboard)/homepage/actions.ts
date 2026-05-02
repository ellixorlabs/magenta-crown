"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearCache } from "@/lib/cache";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { DynamicHomeSection, DynamicProductSection, HomePagePayloadV2 } from "@/lib/home-page-types";
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
    if (sec.type !== "carousel" && sec.type !== "grid" && sec.type !== "promoBanner") return false;
    if (typeof sec.enabled !== "boolean") return false;
    if (typeof sec.order !== "number" || !Number.isFinite(sec.order)) return false;
    if (sec.transition !== "fade" && sec.transition !== "slide" && sec.transition !== "zoom" && sec.transition !== "none") {
      return false;
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
    const productSection: DynamicProductSection = {
      ...s,
      order: i,
      title: s.title.trim() || "Untitled",
      eyebrow: s.eyebrow.trim(),
      productIds: [...new Set(s.productIds.filter(Boolean))]
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
  const session = await requireStaff("/admin/homepage");
  if (!isAdminRole(session.user.role)) {
    redirect("/admin");
  }
  if (!isPayloadV2(payload)) {
    throw new Error("Invalid homepage config: expected version 2 with hero + sections.");
  }

  const normalized = normalizePayloadV2(payload);
  const nowIso = new Date().toISOString();

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("HomePageConfig") as any).upsert({
    id: "default",
    payload: normalized as object,
    updatedAt: nowIso
  });
  if (error) throw new Error(error.message);

  clearCache(HOMEPAGE_BUNDLE_CACHE_KEY);
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}
