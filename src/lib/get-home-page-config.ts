import "server-only";

import { prisma } from "@/lib/prisma";
import { createDefaultHomePagePayloadV2 } from "@/lib/home-page-defaults";
import type { HomePagePayloadV1, HomePagePayloadV2 } from "@/lib/home-page-types";
import { migrateHomePageV1ToV2 } from "@/lib/migrate-home-page-v1-to-v2";
import { randomId } from "@/lib/random-id";

function isPayloadV1(x: unknown): x is HomePagePayloadV1 {
  return (
    typeof x === "object" &&
    x !== null &&
    "version" in x &&
    (x as { version: unknown }).version === 1 &&
    "sections" in x &&
    Array.isArray((x as { sections: unknown }).sections)
  );
}

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
    if (typeof sec.id !== "string") return false;
    if (typeof sec.title !== "string") return false;
    if (sec.type !== "carousel" && sec.type !== "grid") return false;
    if (typeof sec.enabled !== "boolean") return false;
    if (typeof sec.order !== "number") return false;
    if (!Array.isArray(sec.productIds)) return false;
  }
  return true;
}

function normalizePayloadV2(p: HomePagePayloadV2): HomePagePayloadV2 {
  const sorted = [...p.sections].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const sections = sorted.map((s, i) => ({ ...s, order: i }));
  return {
    ...p,
    categoryCircles: {
      enabled: p.categoryCircles.enabled,
      eyebrow: p.categoryCircles.eyebrow.trim(),
      title: p.categoryCircles.title.trim(),
      shape: p.categoryCircles.shape,
      items: p.categoryCircles.items.slice(0, 12).map((it) => ({
        id: it.id,
        label: it.label.trim(),
        imageUrl: it.imageUrl.trim(),
        targetType: it.targetType,
        targetValue: it.targetValue.trim()
      }))
    },
    sections
  };
}

function normalizeLegacyV2(raw: Record<string, unknown>): HomePagePayloadV2 | null {
  if (raw.version !== 2) return null;
  const hero = raw.hero as Record<string, unknown> | undefined;
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  if (!hero || typeof hero.enabled !== "boolean") return null;
  const ccRaw = (raw.categoryCircles as Record<string, unknown> | undefined) ?? {};
  const ccItemsRaw = Array.isArray(ccRaw.items) ? ccRaw.items : [];
  const circles = ccItemsRaw
    .filter((x) => typeof x === "object" && x !== null)
    .map((x) => {
      const it = x as Record<string, unknown>;
      const targetType: "category" | "shopFilter" | "customUrl" =
        it.targetType === "category" || it.targetType === "shopFilter" || it.targetType === "customUrl"
          ? it.targetType
          : "customUrl";
      const targetValue =
        typeof it.targetValue === "string"
          ? it.targetValue
          : typeof it.href === "string"
            ? it.href
            : "/shop";
      return {
        id: typeof it.id === "string" ? it.id : `circle-${randomId()}`,
        label: typeof it.label === "string" ? it.label : "Category",
        imageUrl: typeof it.imageUrl === "string" ? it.imageUrl : "",
        targetType,
        targetValue
      };
    });
  const shape =
    ccRaw.shape === "circle" || ccRaw.shape === "square" || ccRaw.shape === "rectangle"
      ? ccRaw.shape
      : "circle";
  const payload: HomePagePayloadV2 = {
    version: 2 as const,
    hero: { enabled: hero.enabled as boolean },
    categoryCircles: {
      enabled: typeof ccRaw.enabled === "boolean" ? ccRaw.enabled : true,
      eyebrow: typeof ccRaw.eyebrow === "string" ? ccRaw.eyebrow : "Shop by category",
      title: typeof ccRaw.title === "string" ? ccRaw.title : "Explore collections",
      shape,
      items: circles
    },
    sections: sections as HomePagePayloadV2["sections"]
  };
  return payload;
}

export async function getHomePagePayload(): Promise<HomePagePayloadV2> {
  try {
    const row = await prisma.homePageConfig.findUnique({ where: { id: "default" } });
    if (!row?.payload) {
      return normalizePayloadV2(createDefaultHomePagePayloadV2());
    }
    const raw = row.payload as unknown;
    if (isPayloadV2(raw)) {
      return normalizePayloadV2(raw);
    }
    if (typeof raw === "object" && raw !== null) {
      const normalizedLegacy = normalizeLegacyV2(raw as Record<string, unknown>);
      if (normalizedLegacy) return normalizePayloadV2(normalizedLegacy);
    }
    if (isPayloadV1(raw)) {
      return normalizePayloadV2(migrateHomePageV1ToV2(raw));
    }
    return normalizePayloadV2(createDefaultHomePagePayloadV2());
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getHomePagePayload] Database unreachable — using default homepage layout.");
    }
    return normalizePayloadV2(createDefaultHomePagePayloadV2());
  }
}
