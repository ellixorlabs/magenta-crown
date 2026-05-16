import { unstable_cache } from "next/cache";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

function startOfToday() {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export type AdminOpsSnapshot = {
  ordersToday: number;
  ordersLast7d: number;
  revenueToday: number;
  pendingCod: number;
  returnsPending: number;
  exchangesPending: number;
  /** Approximate: closed return requests ÷ orders (30d), % — for ops pulse only. */
  returnRateApproxPct: number;
  lowStockProducts: number;
  recentReviews: number;
  couponRedemptions7d: number;
  /** Top product names by units sold (last 7d, non-cancelled orders), max 3. */
  topSellingLabels: string[];
};

async function loadAdminOpsSnapshot(): Promise<AdminOpsSnapshot> {
  const supabase = getSupabaseServiceRoleClient();
  const t0 = startOfToday().toISOString();
  const t7 = addDays(new Date(), -7).toISOString();
  const t30 = addDays(new Date(), -30).toISOString();

  const [
    ordersTodayRes,
    orders7Res,
    todayOrdersRes,
    pendingCodRes,
    returnsRes,
    exchangesRes,
    lowStockRes,
    reviewsRes,
    couponUsage7Res,
    closedReturns30Res,
    orders30Res,
    orderLines7Res
  ] = await Promise.all([
    (supabase.from("Order") as any)
      .select("id", { count: "exact", head: true })
      .gte("createdAt", t0),
    (supabase.from("Order") as any)
      .select("id", { count: "exact", head: true })
      .gte("createdAt", t7),
    (supabase.from("Order") as any)
      .select("totalAmount,paymentStatus,paymentMethod,orderStatus")
      .gte("createdAt", t0)
      .neq("orderStatus", "CANCELLED")
      .limit(2000),
    (supabase.from("Order") as any)
      .select("id", { count: "exact", head: true })
      .eq("paymentMethod", "COD")
      .eq("paymentStatus", "PENDING")
      .neq("orderStatus", "CANCELLED"),
    (supabase.from("ReturnRequest") as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "REQUESTED"),
    (supabase.from("ExchangeRequest") as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "REQUESTED"),
    (supabase.from("ProductVariant") as any)
      .select("id", { count: "exact", head: true })
      .eq("isActive", true)
      .lte("stock", 3),
    (supabase.from("Review") as any)
      .select("id", { count: "exact", head: true })
      .gte("createdAt", t7),
    (supabase.from("CouponUsage") as any)
      .select("id", { count: "exact", head: true })
      .gte("createdAt", t7),
    (supabase.from("ReturnRequest") as any)
      .select("id", { count: "exact", head: true })
      .in("status", ["APPROVED", "PICKED_UP", "RECEIVED", "REFUNDED"])
      .gte("createdAt", t30),
    (supabase.from("Order") as any)
      .select("id", { count: "exact", head: true })
      .gte("createdAt", t30)
      .neq("orderStatus", "CANCELLED"),
    (supabase.from("OrderItem") as any)
      .select("productId,quantity,order:Order!inner(createdAt,orderStatus),product:Product(name)")
      .gte("order.createdAt", t7)
      .neq("order.orderStatus", "CANCELLED")
      .limit(1200)
  ]);

  let revenueToday = 0;
  for (const o of (todayOrdersRes.data ?? []) as Array<{
    totalAmount: number;
    paymentStatus: string;
    paymentMethod: string;
    orderStatus: string;
  }>) {
    if (o.paymentStatus === "PAID" || o.paymentMethod === "COD") {
      revenueToday += Number(o.totalAmount ?? 0);
    }
  }
  revenueToday = Math.round(revenueToday * 100) / 100;

  const orders30 = orders30Res.count ?? 0;
  const closedR = closedReturns30Res.count ?? 0;
  const returnRateApproxPct =
    orders30 > 0 ? Math.round((closedR / orders30) * 1000) / 10 : 0;

  const qtyByProduct = new Map<string, { qty: number; name: string }>();
  for (const row of (orderLines7Res.data ?? []) as Array<{
    productId: string;
    quantity: number;
    product: { name: string } | null;
  }>) {
    const pid = row.productId;
    const name = row.product?.name?.trim() || "Product";
    const prev = qtyByProduct.get(pid) ?? { qty: 0, name };
    prev.qty += Number(row.quantity ?? 0);
    qtyByProduct.set(pid, prev);
  }
  const topSellingLabels = [...qtyByProduct.entries()]
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 3)
    .map(([, v]) => v.name);

  return {
    ordersToday: ordersTodayRes.count ?? 0,
    ordersLast7d: orders7Res.count ?? 0,
    revenueToday,
    pendingCod: pendingCodRes.count ?? 0,
    returnsPending: returnsRes.count ?? 0,
    exchangesPending: exchangesRes.count ?? 0,
    returnRateApproxPct,
    lowStockProducts: lowStockRes.count ?? 0,
    recentReviews: reviewsRes.count ?? 0,
    couponRedemptions7d: couponUsage7Res.count ?? 0,
    topSellingLabels
  };
}

export const getAdminOpsSnapshot = unstable_cache(loadAdminOpsSnapshot, ["admin-ops-snapshot-v2"], {
  revalidate: 120
});
