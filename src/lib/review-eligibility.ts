import type { SupabaseClient } from "@supabase/supabase-js";

export type VerifiedReviewEligibleLine = {
  orderItemId: string;
  orderId: string;
  label: string;
};

/**
 * Lines for this product the user may review (delivered, in window, no review yet for that line).
 */
export async function fetchVerifiedReviewEligibleLines(
  supabase: SupabaseClient,
  userId: string,
  productId: string
): Promise<VerifiedReviewEligibleLine[]> {
  const { data: orders, error: oErr } = await (supabase.from("Order") as any)
    .select("id,deliveredAt,createdAt,publicOrderRef,orderStatus")
    .eq("userId", userId)
    .eq("orderStatus", "DELIVERED");
  if (oErr) throw new Error(oErr.message);
  const orderList = (orders ?? []) as Array<{
    id: string;
    deliveredAt: string | null;
    createdAt: string;
    publicOrderRef: string | null;
    orderStatus: string;
  }>;
  if (orderList.length === 0) return [];

  const orderIds = orderList.map((o) => o.id);
  const orderMeta = new Map(orderList.map((o) => [o.id, o]));

  const { data: items, error: iErr } = await (supabase.from("OrderItem") as any)
    .select("id,orderId,quantity,product:Product(returnWindowDays)")
    .eq("productId", productId)
    .in("orderId", orderIds);
  if (iErr) throw new Error(iErr.message);

  const { data: reviews, error: rErr } = await (supabase.from("Review") as any)
    .select("orderItemId")
    .eq("productId", productId)
    .not("orderItemId", "is", null);
  if (rErr) throw new Error(rErr.message);
  const reviewedItems = new Set(
    ((reviews ?? []) as Array<{ orderItemId: string | null }>).map((x) => x.orderItemId).filter(Boolean) as string[]
  );

  const rows = (items ?? []) as Array<{
    id: string;
    orderId: string;
    quantity: number;
    product: { returnWindowDays: number } | null;
  }>;

  const out: VerifiedReviewEligibleLine[] = [];
  for (const it of rows) {
    if (reviewedItems.has(it.id)) continue;
    const o = orderMeta.get(it.orderId);
    if (!o) continue;
    const days = it.product?.returnWindowDays ?? 7;
    const anchorMs = o.deliveredAt ? new Date(o.deliveredAt).getTime() : new Date(o.createdAt).getTime();
    const deadline = anchorMs + days * 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) continue;
    const ref = o.publicOrderRef?.trim() || o.id.slice(0, 8);
    out.push({
      orderItemId: it.id,
      orderId: it.orderId,
      label: `Order ${ref} · qty ${it.quantity}`
    });
  }
  return out;
}
