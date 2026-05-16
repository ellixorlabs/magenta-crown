import type { SupabaseClient } from "@supabase/supabase-js";
import { randomId } from "@/lib/random-id";

export type OrderCouponSnapshot = {
  id: string;
  userId: string | null;
  couponId: string | null;
  discountAmount: number | null;
  totalAmount: number | null;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
};

function normPm(pm: string | null | undefined) {
  const s = String(pm ?? "").trim().toUpperCase();
  if (s === "CASH_ON_DELIVERY") return "COD";
  return s;
}

/** Completed sale for coupon ledger: not cancelled; paid online, or COD delivered. */
export function orderQualifiesForCouponAnalytics(o: Pick<OrderCouponSnapshot, "orderStatus" | "paymentStatus" | "paymentMethod">): boolean {
  if (String(o.orderStatus ?? "") === "CANCELLED") return false;
  if (String(o.paymentStatus ?? "") === "PAID") return true;
  const pm = normPm(o.paymentMethod);
  if (pm === "COD" && String(o.orderStatus ?? "") === "DELIVERED") return true;
  return false;
}

/**
 * Idempotent: one CouponUsage row per order. DB trigger refreshes Coupon aggregates.
 * Call when order first enters a qualifying state (e.g. payment PAID, or COD delivered).
 */
export async function recordCouponUsageIfEligible(
  supabase: SupabaseClient,
  order: OrderCouponSnapshot
): Promise<void> {
  if (!order.couponId) return;
  if (!orderQualifiesForCouponAnalytics(order)) return;

  const discountAmount = Number(order.discountAmount ?? 0);
  const orderTotal = Number(order.totalAmount ?? 0);

  const { error } = await (supabase.from("CouponUsage") as any).insert({
    id: randomId(),
    couponId: order.couponId,
    orderId: order.id,
    userId: order.userId,
    discountAmount,
    orderTotal
  });

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") return;
    console.error("[coupon-analytics] CouponUsage insert failed", error.message);
  }
}
