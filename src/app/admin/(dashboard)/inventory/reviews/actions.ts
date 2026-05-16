"use server";

import { revalidatePath } from "next/cache";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { storageObjectPathFromPublicUrl } from "@/lib/storage-public-url";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

const MOD = new Set(["PENDING", "APPROVED", "REJECTED", "HIDDEN"]);

export async function setReviewModeration(formData: FormData) {
  await requireMerchAdmin("/admin/inventory/reviews");
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const status = String(formData.get("moderationStatus") ?? "").trim();
  if (!reviewId || !MOD.has(status)) throw new Error("Invalid moderation update.");
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase.from("Review") as any).update({ moderationStatus: status }).eq("id", reviewId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/inventory/reviews");
  revalidatePath("/product");
}

export async function deleteReviewMediaAdmin(formData: FormData) {
  await requireMerchAdmin("/admin/inventory/reviews");
  const mediaId = String(formData.get("mediaId") ?? "").trim();
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  if (!mediaId || !reviewId) throw new Error("Missing media.");
  const supabase = getSupabaseServiceRoleClient();
  const { data: media, error: mErr } = await (supabase.from("ReviewMedia") as any)
    .select("id,reviewId,type,url,thumbnailUrl")
    .eq("id", mediaId)
    .eq("reviewId", reviewId)
    .maybeSingle();
  if (mErr || !media) throw new Error("Media not found.");

  const pathsImg: string[] = [];
  const pathsVid: string[] = [];
  if (media.type === "IMAGE") {
    const p = storageObjectPathFromPublicUrl(String(media.url), "review_images");
    const pt = media.thumbnailUrl ? storageObjectPathFromPublicUrl(String(media.thumbnailUrl), "review_images") : null;
    if (p) pathsImg.push(p);
    if (pt) pathsImg.push(pt);
  } else {
    const p = storageObjectPathFromPublicUrl(String(media.url), "review_videos");
    if (p) pathsVid.push(p);
  }
  if (pathsImg.length) await supabase.storage.from("review_images").remove(pathsImg);
  if (pathsVid.length) await supabase.storage.from("review_videos").remove(pathsVid);

  const { error: delErr } = await (supabase.from("ReviewMedia") as any).delete().eq("id", mediaId).eq("reviewId", reviewId);
  if (delErr) throw new Error(delErr.message);
  revalidatePath("/admin/inventory/reviews");
  revalidatePath("/product");
}
