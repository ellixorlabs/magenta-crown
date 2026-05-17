"use server";

import { requireMerchAdmin } from "@/lib/admin-auth";
import { revalidateBrandContent } from "@/lib/brand-content-revalidate";
import type { BrandSectionKey } from "@/lib/brand-content";
import { BRAND_CONTENT_DEFAULTS } from "@/lib/brand-content";
import { randomId } from "@/lib/random-id";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

const KEYS = new Set<string>(Object.keys(BRAND_CONTENT_DEFAULTS));

export async function saveBrandContentSection(formData: FormData) {
  await requireMerchAdmin("/admin/content");
  const sectionKey = String(formData.get("sectionKey") ?? "").trim() as BrandSectionKey;
  if (!KEYS.has(sectionKey)) throw new Error("Invalid section.");

  const title = String(formData.get("title") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "");
  const jsonRaw = String(formData.get("jsonData") ?? "").trim();
  let jsonData: unknown = null;
  if (jsonRaw) {
    try {
      jsonData = JSON.parse(jsonRaw);
    } catch {
      throw new Error("Invalid JSON in advanced field.");
    }
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: existing } = await (supabase.from("BrandContent") as any)
    .select("id")
    .eq("sectionKey", sectionKey)
    .maybeSingle();

  const row = {
    title,
    content,
    jsonData,
    updatedAt: new Date().toISOString()
  };

  if (existing?.id) {
    const { error } = await (supabase.from("BrandContent") as any).update(row).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await (supabase.from("BrandContent") as any).insert({
      id: randomId(),
      sectionKey,
      ...row
    });
    if (error) throw new Error(error.message);
  }

  revalidateBrandContent();
}
