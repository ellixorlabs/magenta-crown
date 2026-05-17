import "server-only";

import { unstable_cache } from "next/cache";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  BRAND_CONTENT_CACHE_TAG,
  BRAND_CONTENT_DEFAULTS,
  type BrandContentRow,
  type BrandSectionKey
} from "@/lib/brand-content";

function isMissingBrandContentTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("brandcontent") && (msg.includes("schema cache") || msg.includes("does not exist"));
}

function mergeRow(key: BrandSectionKey, row: BrandContentRow | undefined) {
  const def = BRAND_CONTENT_DEFAULTS[key];
  return {
    sectionKey: key,
    title: row?.title?.trim() || def.title,
    content: row?.content?.trim() ?? def.content,
    jsonData: row?.jsonData ?? def.jsonData ?? null,
    updatedAt: row?.updatedAt ?? null
  };
}

async function loadBrandContentMap(): Promise<Record<BrandSectionKey, ReturnType<typeof mergeRow>>> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await (supabase.from("BrandContent") as any).select(
    'id,"sectionKey",title,content,"jsonData","updatedAt"'
  );
  if (error && !isMissingBrandContentTable(error)) throw new Error(error.message);
  const byKey = new Map<string, BrandContentRow>();
  for (const r of (data ?? []) as BrandContentRow[]) {
    byKey.set(r.sectionKey, r);
  }
  const keys = Object.keys(BRAND_CONTENT_DEFAULTS) as BrandSectionKey[];
  const out = {} as Record<BrandSectionKey, ReturnType<typeof mergeRow>>;
  for (const k of keys) out[k] = mergeRow(k, byKey.get(k));
  return out;
}

export const getBrandContentMap = unstable_cache(loadBrandContentMap, [BRAND_CONTENT_CACHE_TAG], {
  revalidate: 120,
  tags: [BRAND_CONTENT_CACHE_TAG]
});

export async function getBrandSection(key: BrandSectionKey) {
  const map = await getBrandContentMap();
  return map[key];
}
