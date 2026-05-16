"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { requireMerchAdmin } from "@/lib/admin-auth";

export async function createNavLink(formData: FormData) {
  await requireMerchAdmin("/admin/navigation");
  const groupRaw = String(formData.get("group") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!label || !href) throw new Error("Label and href required");

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("HeaderNavLink") as any).insert({
    group: groupRaw || null,
    label,
    href,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: formData.get("isActive") === "on"
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/navigation");
}

export async function deleteNavLink(id: string) {
  await requireMerchAdmin("/admin/navigation");
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("HeaderNavLink") as any).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/navigation");
}

export async function toggleNavLink(id: string, isActive: boolean) {
  await requireMerchAdmin("/admin/navigation");
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("HeaderNavLink") as any).update({ isActive }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/navigation");
}

export async function deleteNavLinkForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteNavLink(id);
}

export async function toggleNavLinkForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (id) await toggleNavLink(id, next);
}
