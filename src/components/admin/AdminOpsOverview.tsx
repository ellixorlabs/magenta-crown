import Link from "next/link";
import type { AdminOpsSnapshot } from "@/lib/admin-ops-snapshot";

export function AdminOpsOverview({ ops }: { ops: AdminOpsSnapshot }) {
  const topLine = ops.topSellingLabels.length ? ops.topSellingLabels.join(" · ") : "—";
  const cells = [
    { label: "Revenue today (approx)", value: `₹${ops.revenueToday.toLocaleString("en-IN")}`, href: "/admin/orders" },
    { label: "Orders today", value: ops.ordersToday, href: "/admin/orders" },
    { label: "Orders (7d)", value: ops.ordersLast7d, href: "/admin/orders" },
    { label: "Pending COD pay", value: ops.pendingCod, href: "/admin/orders" },
    {
      label: "Return activity / orders (30d)",
      value: `${ops.returnRateApproxPct}%`,
      href: "/admin/returns?tab=returns"
    },
    { label: "Top sellers (7d)", value: topLine, href: "/admin/inventory" },
    { label: "Returns requested", value: ops.returnsPending, href: "/admin/returns?tab=returns" },
    { label: "Exchanges requested", value: ops.exchangesPending, href: "/admin/returns?tab=exchanges" },
    { label: "Low-stock variants (≤3)", value: ops.lowStockProducts, href: "/admin/inventory" },
    { label: "Reviews (7d)", value: ops.recentReviews, href: "/admin/inventory/reviews" },
    { label: "Coupon redemptions (7d)", value: ops.couponRedemptions7d, href: "/admin/coupons" }
  ];
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Operations snapshot</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Counts refresh about every two minutes.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 transition hover:border-admin-200 hover:bg-white"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
