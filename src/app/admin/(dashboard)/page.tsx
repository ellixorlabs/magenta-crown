import { auth } from "@/auth";
import { AdminDashboardReport } from "@/components/admin/AdminDashboardReport";
import { AdminOpsOverview } from "@/components/admin/AdminOpsOverview";
import { isFullAdmin } from "@/lib/admin-auth";
import type { AdminDashboardAnalytics } from "@/lib/admin-analytics";
import { getAdminDashboardAnalytics } from "@/lib/admin-analytics";
import type { AdminOpsSnapshot } from "@/lib/admin-ops-snapshot";
import { getAdminOpsSnapshot } from "@/lib/admin-ops-snapshot";

export const metadata = { title: "Overview | Admin | Magenta Crown" };

const EMPTY_OPS: AdminOpsSnapshot = {
  ordersToday: 0,
  ordersLast7d: 0,
  revenueToday: 0,
  pendingCod: 0,
  returnsPending: 0,
  exchangesPending: 0,
  returnRateApproxPct: 0,
  lowStockProducts: 0,
  recentReviews: 0,
  couponRedemptions7d: 0,
  topSellingLabels: []
};

const EMPTY_ANALYTICS: AdminDashboardAnalytics = {
  kpis: [],
  revenueTrend: [],
  orderStatus: [],
  categorySales: [],
  topProducts: [],
  monthlyTarget: {
    pct: 0,
    target: 0,
    monthRevenue: 0,
    todayRevenue: 0,
    message: "Metrics unavailable."
  },
  staffNote: ""
};

export default async function AdminHomePage() {
  const session = await auth();
  const admin = isFullAdmin(session?.user?.role);
  let data: AdminDashboardAnalytics = EMPTY_ANALYTICS;
  let ops: AdminOpsSnapshot = EMPTY_OPS;
  let metricsError: string | null = null;
  try {
    [data, ops] = await Promise.all([getAdminDashboardAnalytics(), getAdminOpsSnapshot()]);
  } catch (e) {
    metricsError = e instanceof Error ? e.message : "Could not load dashboard metrics.";
  }

  return (
    <div className="space-y-8">
      {metricsError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
          <strong className="font-semibold">Overview metrics failed to load.</strong>{" "}
          <span className="opacity-90">{metricsError}</span>
          <p className="mt-2 text-xs text-amber-900/90">
            You can still use the sidebar. Check Supabase connectivity, RLS/service role keys, and server logs.
          </p>
        </div>
      ) : null}
      <AdminOpsOverview ops={ops} />
      <AdminDashboardReport data={data} showStaffNote={admin} />
    </div>
  );
}
