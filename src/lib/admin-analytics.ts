import { prisma } from "@/lib/prisma";

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

  const [
    grossAll,
    revenueAll,
    orderCountAll,
    customerCount,
    gross30,
    grossPrev30,
    rev30,
    revPrev30,
    ord30,
    ordPrev30,
    cust30,
    custPrev30,
    ordersByStatus,
    orderItemsAgg,
    trendOrders
  ] = await Promise.all([
    prisma.order.aggregate({
      where: PAID,
      _sum: { subtotalBeforeDiscount: true }
    }),
    prisma.order.aggregate({
      where: PAID,
      _sum: { totalAmount: true }
    }),
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.aggregate({
      where: { ...PAID, createdAt: { gte: d30 } },
      _sum: { subtotalBeforeDiscount: true }
    }),
    prisma.order.aggregate({
      where: { ...PAID, createdAt: { gte: d60, lt: d30 } },
      _sum: { subtotalBeforeDiscount: true }
    }),
    prisma.order.aggregate({
      where: { ...PAID, createdAt: { gte: d30 } },
      _sum: { totalAmount: true }
    }),
    prisma.order.aggregate({
      where: { ...PAID, createdAt: { gte: d60, lt: d30 } },
      _sum: { totalAmount: true }
    }),
    prisma.order.count({ where: { createdAt: { gte: d30 } } }),
    prisma.order.count({ where: { createdAt: { gte: d60, lt: d30 } } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: d60, lt: d30 } } }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true }
    }),
    prisma.orderItem.findMany({
      where: { order: PAID },
      select: {
        quantity: true,
        price: true,
        product: { select: { id: true, name: true, slug: true, category: true } }
      },
      take: 8000
    }),
    prisma.order.findMany({
      where: { ...PAID, createdAt: { gte: addDays(now, -400) } },
      select: { totalAmount: true, createdAt: true }
    })
  ]);

  const g30 = gross30._sum.subtotalBeforeDiscount ?? 0;
  const gP30 = grossPrev30._sum.subtotalBeforeDiscount ?? 0;
  const r30 = rev30._sum.totalAmount ?? 0;
  const rP30 = revPrev30._sum.totalAmount ?? 0;
  const o30 = ord30;
  const oP30 = ordPrev30;
  const c30 = cust30;
  const cP30 = custPrev30;

  const kpis: AdminKpi[] = [
    {
      label: "Gross sales",
      value: formatInr(grossAll._sum.subtotalBeforeDiscount ?? 0),
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
      value: formatInr(revenueAll._sum.totalAmount ?? 0),
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
    revByMonth.set(k, (revByMonth.get(k) ?? 0) + o.totalAmount);
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

  const statusTotal = ordersByStatus.reduce((s, x) => s + x._count._all, 0) || 1;
  const orderStatus: OrderStatusSlice[] = ordersByStatus.map((r) => ({
    status: r.status,
    count: r._count._all,
    pct: (r._count._all / statusTotal) * 100
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
  const [monthAgg, todayAgg, lastMonthRev] = await Promise.all([
    prisma.order.aggregate({
      where: { ...PAID, createdAt: { gte: monthStart } },
      _sum: { totalAmount: true }
    }),
    prisma.order.aggregate({
      where: { ...PAID, createdAt: { gte: today } },
      _sum: { totalAmount: true }
    }),
    prisma.order.aggregate({
      where: {
        ...PAID,
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          lt: monthStart
        }
      },
      _sum: { totalAmount: true }
    })
  ]);
  const monthRevenue = monthAgg._sum.totalAmount ?? 0;
  const prevMonth = lastMonthRev._sum.totalAmount ?? 0;
  const target = Math.max(Math.round(prevMonth * 1.1), Math.round(monthRevenue > 0 ? monthRevenue * 1.15 : 25000));
  const pct = target > 0 ? Math.min(100, (monthRevenue / target) * 100) : 0;
  const monthlyTarget: MonthlyTarget = {
    pct,
    target,
    monthRevenue,
    todayRevenue: todayAgg._sum.totalAmount ?? 0,
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
