import Link from "next/link";
import { canMutateAdminOrders, requireStaff } from "@/lib/admin-auth";
import { AdminOrdersBulkBar } from "@/components/admin/AdminOrdersBulkBar";
import { ORDER_STATUSES } from "@/lib/order-domain";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { NextAppPageSearch } from "@/types/next-app";

type PageProps = NextAppPageSearch<{ orderStatus?: string; returns?: string }>;

const STATUS_TAB_SET = new Set<string>(ORDER_STATUSES);

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const session = await requireStaff("/admin/orders");
  const canMutate = canMutateAdminOrders(session.user.role);
  const sp = await searchParams;
  const returnsOnly = String(sp.returns ?? "").trim() === "1";
  const rawStatus = String(sp.orderStatus ?? "").trim().toUpperCase();
  const statusFilter = !returnsOnly && rawStatus && STATUS_TAB_SET.has(rawStatus) ? rawStatus : null;

  const supabase = getSupabaseServiceRoleClient();
  let listQuery = (supabase.from("Order") as any)
    .select(
      "id,publicOrderRef,orderStatus,paymentStatus,returnStatus,totalAmount,subtotalBeforeDiscount,discountAmount,couponCode,trackingUrl,createdAt,user:User(email,name),guestEmail"
    )
    .order("createdAt", { ascending: false })
    .limit(100);

  if (returnsOnly) {
    listQuery = listQuery.neq("returnStatus", "NONE");
  } else if (statusFilter) {
    listQuery = listQuery.eq("orderStatus", statusFilter);
  }

  const [{ data: orders, error }, { data: countRows, error: countErr }] = await Promise.all([
    listQuery,
    (supabase.from("Order") as any).select("orderStatus,returnStatus").limit(5000)
  ]);
  if (error) throw new Error(error.message);
  if (countErr) throw new Error(countErr.message);

  const rows = (orders ?? []) as Array<{
    id: string;
    publicOrderRef: string | null;
    orderStatus: string;
    paymentStatus: string;
    returnStatus: string;
    totalAmount: number;
    subtotalBeforeDiscount: number;
    discountAmount: number;
    couponCode: string | null;
    trackingUrl: string | null;
    createdAt: string;
    user: { email: string | null; name: string | null } | null;
    guestEmail: string | null;
  }>;

  const counts: Record<string, number> = { all: 0, returnsPipeline: 0 };
  for (const s of ORDER_STATUSES) counts[s] = 0;
  for (const o of (countRows ?? []) as Array<{ orderStatus: string; returnStatus: string }>) {
    counts.all += 1;
    const os = o.orderStatus;
    if (os && os in counts) counts[os] += 1;
    if (o.returnStatus && o.returnStatus !== "NONE") counts.returnsPipeline += 1;
  }

  const activeTabId = returnsOnly ? "RETURNS" : statusFilter ?? "ALL";

  const tabs: { label: string; href: string; count: number; id: string }[] = [
    { label: "All", href: "/admin/orders", count: counts.all, id: "ALL" },
    ...ORDER_STATUSES.map((s) => ({
      label: s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      href: `/admin/orders?orderStatus=${s}`,
      count: counts[s] ?? 0,
      id: s
    })),
    { label: "Returns pipeline", href: "/admin/orders?returns=1", count: counts.returnsPipeline, id: "RETURNS" }
  ];

  return (
    <div className="space-y-4 overflow-x-hidden">
      <p className="text-sm text-zinc-600">
        Latest 100 orders (filtered). For revenue and product analytics, use{" "}
        <Link href="/admin" className="font-medium text-admin-700 hover:underline">
          Overview
        </Link>
        .
      </p>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeTabId === tab.id
                ? "border border-admin-300 bg-admin-50 text-admin-800 shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                activeTabId === tab.id ? "bg-admin-100 text-admin-700" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {tab.count}
            </span>
          </Link>
        ))}
      </div>
      <AdminOrdersBulkBar
        canMutate={canMutate}
        orders={rows.map((o) => ({ id: o.id, publicOrderRef: o.publicOrderRef }))}
      />
      <ul className="space-y-3">
        {rows.map((o) => (
          <li key={o.id} className="rounded-2xl border border-zinc-200/90 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap justify-between gap-2">
              {o.publicOrderRef ? (
                <Link
                  href={`/admin/orders/${encodeURIComponent(o.publicOrderRef)}`}
                  className="font-mono text-sm font-semibold text-admin-800 underline decoration-admin-300 underline-offset-2 hover:text-admin-950"
                >
                  {o.publicOrderRef}
                </Link>
              ) : (
                <span className="font-mono text-sm font-semibold text-zinc-600">Legacy order (no public reference)</span>
              )}
              <span className="break-all text-zinc-600">{new Date(o.createdAt).toLocaleString()}</span>
            </div>
            {!o.publicOrderRef && <p className="mt-0.5 text-xs text-zinc-400">Legacy row — internal ID only</p>}
            <p className="mt-1 break-words text-zinc-700">
              <span className="font-medium text-zinc-900">{o.orderStatus}</span>
              {" · "}
              <span className="text-zinc-600">{o.paymentStatus}</span>
              {o.returnStatus !== "NONE" ? (
                <>
                  {" · "}
                  <span className="text-amber-800">Return: {o.returnStatus}</span>
                </>
              ) : null}
              {" · Rs "}
              {o.totalAmount.toFixed(0)}
              {o.discountAmount > 0 ? (
                <span className="text-zinc-500">
                  {" "}
                  (subtotal Rs {o.subtotalBeforeDiscount.toFixed(0)}, discount −Rs {o.discountAmount.toFixed(0)}
                  {o.couponCode ? `, ${o.couponCode}` : ""})
                </span>
              ) : null}{" "}
              · {o.user?.email ?? o.guestEmail ?? "Guest"}
            </p>
            {o.trackingUrl && (
              <a
                href={o.trackingUrl}
                className="mt-2 inline-block font-medium text-admin-700 underline"
                target="_blank"
                rel="noreferrer"
              >
                Tracking
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
