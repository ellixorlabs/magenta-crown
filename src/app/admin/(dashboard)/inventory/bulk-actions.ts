"use server";

import { revalidatePath } from "next/cache";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { clearCacheByPrefix } from "@/lib/cache";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

const ALLOWED = new Set(["ACTIVE", "ARCHIVED", "DRAFT", "SOLD_OUT"]);

export async function bulkSetProductStatus(formData: FormData) {
  await requireMerchAdmin("/admin/inventory");
  const rawIds = String(formData.get("productIds") ?? "").trim();
  const status = String(formData.get("productStatus") ?? "").trim().toUpperCase();
  const ids = rawIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  if (!ids.length || !ALLOWED.has(status)) throw new Error("Invalid bulk product update.");

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("Product") as any).update({ status }).in("id", ids);
  if (error) throw new Error(error.message);

  clearCacheByPrefix("products");
  clearCacheByPrefix("homepage");
  revalidatePath("/admin/inventory");
}
