"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { DynamicProductSection, HomePagePayloadV2 } from "@/lib/home-page-types";

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
    if (typeof sec.id !== "string" || !sec.id.trim()) return false;
    if (typeof sec.title !== "string") return false;
    if (typeof sec.eyebrow !== "string") return false;
    if (sec.type !== "carousel" && sec.type !== "grid") return false;
    if (typeof sec.enabled !== "boolean") return false;
    if (typeof sec.order !== "number" || !Number.isFinite(sec.order)) return false;
    if (!Array.isArray(sec.productIds)) return false;
    if (!sec.productIds.every((id) => typeof id === "string")) return false;
    if (sec.transition !== "fade" && sec.transition !== "slide" && sec.transition !== "zoom" && sec.transition !== "none") {
      return false;
    }
    if (sec.viewAllHref != null && typeof sec.viewAllHref !== "string") return false;
  }
  return true;
}

function normalizePayloadV2(p: HomePagePayloadV2): HomePagePayloadV2 {
  const sorted = [...p.sections].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const sections: DynamicProductSection[] = sorted.map((s, i) => ({
    ...s,
    order: i,
    title: s.title.trim() || "Untitled",
    eyebrow: s.eyebrow.trim(),
    productIds: [...new Set(s.productIds.filter(Boolean))]
  }));
  return { version: 2, hero: { enabled: p.hero.enabled }, sections };
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

  await prisma.homePageConfig.upsert({
    where: { id: "default" },
    create: { id: "default", payload: normalized as object },
    update: { payload: normalized as object }
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/homepage");
}
