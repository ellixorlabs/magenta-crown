import Link from "next/link";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { NextAppPageSearch } from "@/types/next-app";

type PageProps = NextAppPageSearch<{ status?: string }>;

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = sp.status?.trim().toUpperCase();
  const activeStatus = status && status.length > 0 ? status : "ALL";
  const allowed = new Set(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]);
  const supabase = getSupabaseServiceRoleClient();
  let q = (supabase.from("Order") as any)
    .select("*,items:OrderItem(*,product:Product(*)),user:User(email,name)")
    .order("createdAt", { ascending: false })
    .limit(100);
  if (status && allowed.has(status)) {
    q = q.eq("status", status);
  }
  const [{ data: orders, error }, { data: statusRows, error: statusErr }] = await Promise.all([
    q,
    (supabase.from("Order") as any).select("status").limit(5000)
  ]);
  if (error) throw new Error(error.message);
  if (statusErr) throw new Error(statusErr.message);
  const rows = (orders ?? []) as any[];
  const counts = ((statusRows ?? []) as any[]).reduce(
    (acc, o) => {
      const s = String(o.status ?? "").toUpperCase();
      acc.all += 1;
      if (s in acc) (acc as Record<string, number>)[s] += 1;
      return acc;
    },
    { all: 0, PENDING: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0, RETURNED: 0 }
  );

  return (
    <div className="space-y-4 overflow-x-hidden">
      <p className="text-sm text-zinc-600">
        Latest 100 orders. For revenue and product analytics, use{" "}
        <Link href="/admin" className="font-medium text-admin-700 hover:underline">
          Overview
        </Link>
        .
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All", href: "/admin/orders", count: counts.all, id: "ALL" },
          { label: "Pending", href: "/admin/orders?status=PENDING", count: counts.PENDING, id: "PENDING" },
          { label: "Processing", href: "/admin/orders?status=PROCESSING", count: counts.PROCESSING, id: "PROCESSING" },
          { label: "Shipped", href: "/admin/orders?status=SHIPPED", count: counts.SHIPPED, id: "SHIPPED" },
          { label: "Delivered", href: "/admin/orders?status=DELIVERED", count: counts.DELIVERED, id: "DELIVERED" },
          { label: "Cancelled", href: "/admin/orders?status=CANCELLED", count: counts.CANCELLED, id: "CANCELLED" },
          { label: "Returns", href: "/admin/orders?status=RETURNED", count: counts.RETURNED, id: "RETURNED" }
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeStatus === tab.id
                ? "border border-admin-300 bg-admin-50 text-admin-800 shadow-sm"
                : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                activeStatus === tab.id ? "bg-admin-100 text-admin-700" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {tab.count}
            </span>
          </Link>
        ))}
      </div>
      <ul className="space-y-3">
        {rows.map((o: any) => (
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
            {!o.publicOrderRef && (
              <p className="mt-0.5 text-xs text-zinc-400">Legacy row — internal ID only</p>
            )}
            <p className="mt-1 break-words text-zinc-700">
              {o.status} · Rs {o.totalAmount.toFixed(0)}
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
              <a href={o.trackingUrl} className="mt-2 inline-block font-medium text-admin-700 underline" target="_blank" rel="noreferrer">
                Tracking
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
