"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { isValidCouponCodeFormat, normalizeCouponCode } from "@/lib/coupon";

export async function createCoupon(formData: FormData) {
  await requireMerchAdmin("/admin/coupons");
  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  const discountPct = Number(formData.get("discountPct"));
  if (!isValidCouponCodeFormat(code) || !Number.isFinite(discountPct) || discountPct <= 0 || discountPct > 100) {
    throw new Error("Invalid coupon: use 2–32 letters or numbers only.");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("Coupon") as any).insert({
    code,
    discountPct,
    isActive: formData.get("isActive") === "on"
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/coupons");
}

export async function toggleCoupon(id: string, isActive: boolean) {
  await requireMerchAdmin("/admin/coupons");
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("Coupon") as any).update({ isActive }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(id: string) {
  await requireMerchAdmin("/admin/coupons");
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("Coupon") as any).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/coupons");
}

export async function deleteCouponForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteCoupon(id);
}

export async function toggleCouponForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (id) await toggleCoupon(id, next);
}
