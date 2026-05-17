import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export type StorageHygieneReport = {
  productImageUrls: number;
  reviewMediaUrls: number;
  draftProducts: number;
  pendingEmailOutbox: number;
  failedEmailOutbox: number;
  scannedAt: string;
};

/** Lightweight reference counts — not a full orphan blob walk (run separately in ops). */
export async function scanStorageHygiene(): Promise<StorageHygieneReport> {
  const supabase = getSupabaseServiceRoleClient();

  const [productsRes, reviewMediaRes, draftsRes, pendingMailRes, failedMailRes] = await Promise.all([
    (supabase.from("Product") as any).select("imageUrls").limit(2000),
    (supabase.from("ReviewMedia") as any).select("id", { count: "exact", head: true }),
    (supabase.from("Product") as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "DRAFT"),
    (supabase.from("email_outbox") as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING"),
    (supabase.from("email_outbox") as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "FAILED")
  ]);

  let productImageUrls = 0;
  for (const p of (productsRes.data ?? []) as Array<{ imageUrls?: string[] }>) {
    productImageUrls += (p.imageUrls ?? []).length;
  }

  return {
    productImageUrls,
    reviewMediaUrls: reviewMediaRes.count ?? 0,
    draftProducts: draftsRes.count ?? 0,
    pendingEmailOutbox: pendingMailRes.count ?? 0,
    failedEmailOutbox: failedMailRes.count ?? 0,
    scannedAt: new Date().toISOString()
  };
}
