import type { SupabaseClient } from "@supabase/supabase-js";

export async function adjustVariantStockById(
  supabase: SupabaseClient,
  variantId: string,
  delta: number
): Promise<void> {
  const { data: v, error } = await supabase.from("ProductVariant").select("stock").eq("id", variantId).maybeSingle();
  if (error || !v) throw new Error(`STOCK_LOOKUP:${variantId}`);
  const cur = (v as { stock: number }).stock;
  const next = Math.max(0, cur + delta);
  const u = await (supabase.from("ProductVariant") as any).update({ stock: next }).eq("id", variantId);
  if (u.error) throw new Error(`STOCK_UPDATE_FAILED:${u.error.message}`);
}

export async function restoreStockForOrderLines(supabase: SupabaseClient, orderId: string): Promise<void> {
  const { data: lines, error } = await (supabase.from("OrderItem") as any)
    .select("quantity,variantId")
    .eq("orderId", orderId);
  if (error) throw new Error(error.message);
  for (const row of (lines ?? []) as Array<{ quantity: number; variantId: string | null }>) {
    if (!row.variantId) continue;
    await adjustVariantStockById(supabase, row.variantId, row.quantity);
  }
}
