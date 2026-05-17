"use server";

import { revalidatePath } from "next/cache";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function setSupportInquiryStatus(formData: FormData) {
  await requireMerchAdmin("/admin/support");
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id || (status !== "OPEN" && status !== "RESOLVED")) throw new Error("Invalid request.");

  const supabase = getSupabaseServiceRoleClient();
  const patch: Record<string, unknown> = { status };
  if (status === "RESOLVED") patch.resolvedAt = new Date().toISOString();
  else patch.resolvedAt = null;

  const { error } = await (supabase.from("SupportInquiry") as any).update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/support");
}

export async function deleteSupportInquiry(formData: FormData) {
  await requireMerchAdmin("/admin/support");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing id.");
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("SupportInquiry") as any).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/support");
}
