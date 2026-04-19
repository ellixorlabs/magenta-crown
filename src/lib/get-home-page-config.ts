import { prisma } from "@/lib/prisma";
import { createDefaultHomePagePayloadV2 } from "@/lib/home-page-defaults";
import type { HomePagePayloadV1, HomePagePayloadV2 } from "@/lib/home-page-types";
import { migrateHomePageV1ToV2 } from "@/lib/migrate-home-page-v1-to-v2";

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
  return { ...p, sections };
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
