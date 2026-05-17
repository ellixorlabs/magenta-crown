"use server";

import { revalidatePath } from "next/cache";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { randomId } from "@/lib/random-id";
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
  revalidatePath(`/admin/support/${id}`);
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

export async function assignSupportInquiry(formData: FormData) {
  const session = await requireMerchAdmin("/admin/support");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing inquiry id.");

  const staffName = session.user.name?.trim() || session.user.email;
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("SupportInquiry") as any)
    .update({
      assignedStaffId: session.user.id,
      assignedStaffName: staffName,
      assignedAt: new Date().toISOString()
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/support/${id}`);
  revalidatePath("/admin/support");
}

export async function addSupportInquiryNote(formData: FormData) {
  const session = await requireMerchAdmin("/admin/support");
  const inquiryId = String(formData.get("inquiryId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!inquiryId || !body) throw new Error("Note cannot be empty.");
  if (body.length > 4000) throw new Error("Note too long.");

  const staffName = session.user.name?.trim() || session.user.email;
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("SupportInquiryNote") as any).insert({
    id: randomId(),
    inquiryId,
    body,
    staffUserId: session.user.id,
    staffName
  });
  if (error) {
    if (error.code === "42P01") throw new Error("Notes table missing — run latest Supabase migration.");
    throw new Error(error.message);
  }
  revalidatePath(`/admin/support/${inquiryId}`);
}
