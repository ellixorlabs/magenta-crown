import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

const PAID = { status: { in: ["PAID", "SHIPPED"] } };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short" });
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export type KpiDelta = { pct: number | null; label: string };

export type AdminKpi = {
  label: string;
  value: string;
  sub: string;
  delta: KpiDelta;
  positiveGood: boolean;
};

export type MonthlyPoint = { label: string; current: number; previous: number };

export type OrderStatusSlice = { status: string; count: number; pct: number };

export type CategorySale = { category: string; amount: number; pct: number };

export type TopProductRow = {
  productId: string;
  name: string;
  slug: string;
  category: string;
  quantity: number;
  revenue: number;
};

export type MonthlyTarget = {
  pct: number;
  target: number;
  monthRevenue: number;
  todayRevenue: number;
  message: string;
};

export type AdminDashboardAnalytics = {
  kpis: AdminKpi[];
  revenueTrend: MonthlyPoint[];
  orderStatus: OrderStatusSlice[];
  categorySales: CategorySale[];
  topProducts: TopProductRow[];
  monthlyTarget: MonthlyTarget;
  staffNote: string;
};

export function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(n);
}

export async function getAdminDashboardAnalytics(): Promise<AdminDashboardAnalytics> {
  const now = new Date();
  const d30 = addDays(now, -30);
  const d60 = addDays(now, -60);
  const supabase = getSupabaseServiceRoleClient();

  const [ordersRes, usersRes, orderItemsRes] = await Promise.all([
    (supabase.from("Order") as any)
      .select("id,status,totalAmount,subtotalBeforeDiscount,createdAt")
      .gte("createdAt", addDays(now, -400).toISOString()),
    (supabase.from("User") as any).select("role,createdAt"),
    (supabase.from("OrderItem") as any).select(
      "quantity,price,order:Order!inner(status),product:Product(id,name,slug,category)"
    )
  ]);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (usersRes.error) throw new Error(usersRes.error.message);
  if (orderItemsRes.error) throw new Error(orderItemsRes.error.message);
  const orders = (ordersRes.data ?? []) as Array<{ id: string; status: string; totalAmount: number; subtotalBeforeDiscount: number; createdAt: string }>;
  const users = (usersRes.data ?? []) as Array<{ role: string; createdAt: string }>;
  const orderItemsAgg = ((orderItemsRes.data ?? []) as Array<{
    quantity: number;
    price: number;
    order: { status: string };
    product: { id: string; name: string; slug: string; category: string };
  }>).filter((r) => ["PAID", "SHIPPED"].includes(r.order.status));
  const paidOrders = orders.filter((o) => ["PAID", "SHIPPED"].includes(o.status));
  const orderCountAll = orders.length;
  const customerRows = users.filter((u) => u.role === "CUSTOMER");
  const customerCount = customerRows.length;
  const sum = (arr: Array<{ totalAmount?: number; subtotalBeforeDiscount?: number }>, field: "totalAmount" | "subtotalBeforeDiscount") =>
    arr.reduce((acc, row) => acc + Number(row[field] ?? 0), 0);
  const inRange = (iso: string, start: Date, end?: Date) => {
    const t = new Date(iso).getTime();
    if (t < start.getTime()) return false;
    if (end && t >= end.getTime()) return false;
    return true;
  };
  const grossAllValue = sum(paidOrders, "subtotalBeforeDiscount");
  const revenueAllValue = sum(paidOrders, "totalAmount");
  const gross30Value = sum(paidOrders.filter((o) => inRange(o.createdAt, d30)), "subtotalBeforeDiscount");
  const grossPrev30Value = sum(paidOrders.filter((o) => inRange(o.createdAt, d60, d30)), "subtotalBeforeDiscount");
  const rev30Value = sum(paidOrders.filter((o) => inRange(o.createdAt, d30)), "totalAmount");
  const revPrev30Value = sum(paidOrders.filter((o) => inRange(o.createdAt, d60, d30)), "totalAmount");
  const ord30 = orders.filter((o) => inRange(o.createdAt, d30)).length;
  const ordPrev30 = orders.filter((o) => inRange(o.createdAt, d60, d30)).length;
  const cust30 = customerRows.filter((u) => inRange(u.createdAt, d30)).length;
  const custPrev30 = customerRows.filter((u) => inRange(u.createdAt, d60, d30)).length;
  const statusMap = new Map<string, number>();
  for (const o of orders) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
  const ordersByStatus = [...statusMap.entries()].map(([status, count]) => ({ status, count }));
  const trendOrders = paidOrders;

  const g30 = gross30Value;
  const gP30 = grossPrev30Value;
  const r30 = rev30Value;
  const rP30 = revPrev30Value;
  const o30 = ord30;
  const oP30 = ordPrev30;
  const c30 = cust30;
  const cP30 = custPrev30;

  const kpis: AdminKpi[] = [
    {
      label: "Gross sales",
      value: formatInr(grossAllValue),
      sub: "Paid & shipped (subtotal)",
      delta: {
        pct: pctChange(g30, gP30),
        label: "vs prior 30 days"
      },
      positiveGood: true
    },
    {
      label: "Total orders",
      value: String(orderCountAll),
      sub: "All statuses",
      delta: {
        pct: pctChange(o30, oP30),
        label: "vs prior 30 days"
      },
      positiveGood: true
    },
    {
      label: "Net revenue",
      value: formatInr(revenueAllValue),
      sub: "Paid & shipped (after discounts)",
      delta: {
        pct: pctChange(r30, rP30),
        label: "vs prior 30 days"
      },
      positiveGood: true
    },
    {
      label: "Customers",
      value: String(customerCount),
      sub: "Registered customers",
      delta: {
        pct: pctChange(c30, cP30),
        label: "new vs prior 30 days"
      },
      positiveGood: true
    }
  ];

  const revByMonth = new Map<string, number>();
  for (const o of trendOrders) {
    const k = monthKey(new Date(o.createdAt));
    revByMonth.set(k, (revByMonth.get(k) ?? 0) + Number(o.totalAmount ?? 0));
  }

  const revenueTrend: MonthlyPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const cur = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prev = new Date(now.getFullYear(), now.getMonth() - i - 6, 1);
    const ck = monthKey(cur);
    const pk = monthKey(prev);
    revenueTrend.push({
      label: monthLabel(ck),
      current: revByMonth.get(ck) ?? 0,
      previous: revByMonth.get(pk) ?? 0
    });
  }

  const statusTotal = ordersByStatus.reduce((s, x) => s + x.count, 0) || 1;
  const orderStatus: OrderStatusSlice[] = ordersByStatus.map((r) => ({
    status: r.status,
    count: r.count,
    pct: (r.count / statusTotal) * 100
  }));

  const catMap = new Map<string, number>();
  let catSum = 0;
  for (const row of orderItemsAgg) {
    const cat = row.product.category || "Uncategorized";
    const amt = row.price * row.quantity;
    catMap.set(cat, (catMap.get(cat) ?? 0) + amt);
    catSum += amt;
  }
  const categorySales: CategorySale[] = [...catMap.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      pct: catSum > 0 ? (amount / catSum) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const prodMap = new Map<
    string,
    { name: string; slug: string; category: string; quantity: number; revenue: number }
  >();
  for (const row of orderItemsAgg) {
    const id = row.product.id;
    const prev = prodMap.get(id);
    const rev = row.price * row.quantity;
    if (!prev) {
      prodMap.set(id, {
        name: row.product.name,
        slug: row.product.slug,
        category: row.product.category,
        quantity: row.quantity,
        revenue: rev
      });
    } else {
      prev.quantity += row.quantity;
      prev.revenue += rev;
    }
  }
  const topProducts: TopProductRow[] = [...prodMap.entries()]
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = startOfDay(now);
  const monthRevenue = sum(paidOrders.filter((o) => inRange(o.createdAt, monthStart)), "totalAmount");
  const todayRevenue = sum(paidOrders.filter((o) => inRange(o.createdAt, today)), "totalAmount");
  const prevMonth = sum(
    paidOrders.filter((o) => inRange(o.createdAt, new Date(now.getFullYear(), now.getMonth() - 1, 1), monthStart)),
    "totalAmount"
  );
  const target = Math.max(Math.round(prevMonth * 1.1), Math.round(monthRevenue > 0 ? monthRevenue * 1.15 : 25000));
  const pct = target > 0 ? Math.min(100, (monthRevenue / target) * 100) : 0;
  const monthlyTarget: MonthlyTarget = {
    pct,
    target,
    monthRevenue,
    todayRevenue,
    message:
      pct >= 100
        ? "You have reached this month’s revenue target."
        : "Keep momentum — revenue is tracking against your monthly goal."
  };

  const staffNote =
    "How to grant admin access: set User.role to ADMIN in the database, then sign out and back in. SUB_ADMIN can manage inventory and orders; homepage, hero, coupons, and navigation are ADMIN-only.";

  return {
    kpis,
    revenueTrend,
    orderStatus,
    categorySales,
    topProducts,
    monthlyTarget,
    staffNote
  };
}
