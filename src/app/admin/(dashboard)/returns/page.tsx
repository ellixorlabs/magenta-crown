import Link from "next/link";
import { requireStaff } from "@/lib/admin-auth";
import { canMutateAdminOrders } from "@/lib/admin-permissions";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { NextAppPageSearch } from "@/types/next-app";
import {
  EXCHANGE_REQUEST_STATUSES,
  REFUND_STATUSES,
  RETURN_REQUEST_STATUSES
} from "@/lib/return-exchange-domain";
import { updateExchangeRequestAdminForm, updateReturnRequestAdminForm } from "@/app/admin/(dashboard)/returns/actions";

export const metadata = { title: "Returns & exchanges | Admin" };

type PageProps = NextAppPageSearch<{ tab?: string; page?: string }>;

const PAGE_SIZE = 25;

export default async function AdminReturnsPage({ searchParams }: PageProps) {
  const session = await requireStaff("/admin/returns");
  const sp = await searchParams;
  const tab = sp.tab === "exchanges" ? "exchanges" : "returns";
  const page = Math.max(1, Math.floor(Number(sp.page ?? "1") || 1));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const canMutate = canMutateAdminOrders(session.user.role);

  const supabase = getSupabaseServiceRoleClient();

  if (tab === "exchanges") {
    const { data: rows, error, count } = await (supabase.from("ExchangeRequest") as any)
      .select(
        "id,status,reason,createdAt,orderId,orderItemId,user:User(email),order:Order(publicOrderRef)",
        { count: "exact" }
      )
      .order("createdAt", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);

    return (
      <div className="space-y-4 overflow-x-hidden">
        <TabBar tab={tab} />
        <p className="text-sm text-zinc-600">
          {count ?? 0} exchange request(s). Operational updates require merch admin.
        </p>
        <ul className="space-y-4">
          {((rows ?? []) as any[]).map((r) => (
            <li key={r.id} className="rounded-2xl border border-zinc-200/90 bg-white p-4 text-sm shadow-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-mono text-xs text-zinc-500">{r.id}</span>
                <span className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 font-medium text-zinc-900">
                {r.order?.publicOrderRef ? (
                  <Link href={`/admin/orders/${encodeURIComponent(r.order.publicOrderRef)}`} className="text-admin-800 underline">
                    {r.order.publicOrderRef}
                  </Link>
                ) : (
                  "—"
                )}{" "}
                · {r.status} · {r.user?.email ?? "—"}
              </p>
              <p className="mt-1 text-zinc-600">Reason: {r.reason}</p>
              {canMutate ? (
                <form action={updateExchangeRequestAdminForm} className="mt-3 grid gap-2 border-t border-zinc-100 pt-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="text-xs text-zinc-600">
                    Status
                    <select name="status" defaultValue={r.status} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
                      {EXCHANGE_REQUEST_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-600 sm:col-span-2">
                    Admin notes
                    <textarea name="adminNotes" rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                  </label>
                  <label className="text-xs text-zinc-600 sm:col-span-2">
                    Customer notes
                    <textarea name="customerNotes" rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                  </label>
                  <label className="text-xs text-zinc-600 sm:col-span-2">
                    Internal description
                    <textarea name="description" rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                  </label>
                  <button type="submit" className="rounded-full bg-admin-600 px-4 py-2 text-xs font-semibold text-white hover:bg-admin-700">
                    Save
                  </button>
                </form>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">Read-only for tech support.</p>
              )}
            </li>
          ))}
        </ul>
        <Pager tab={tab} page={page} total={count ?? 0} />
      </div>
    );
  }

  const { data: rows, error, count } = await (supabase.from("ReturnRequest") as any)
    .select(
      "id,status,refundStatus,reason,createdAt,orderId,orderItemId,user:User(email),order:Order(publicOrderRef)",
      { count: "exact" }
    )
    .order("createdAt", { ascending: false })
    .range(from, to);
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-4 overflow-x-hidden">
      <TabBar tab={tab} />
      <p className="text-sm text-zinc-600">
        {count ?? 0} return request(s). Refunds and pickup fields are tracked per row.
      </p>
      <ul className="space-y-4">
        {((rows ?? []) as any[]).map((r) => (
          <li key={r.id} className="rounded-2xl border border-zinc-200/90 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-mono text-xs text-zinc-500">{r.id}</span>
              <span className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 font-medium text-zinc-900">
              {r.order?.publicOrderRef ? (
                <Link href={`/admin/orders/${encodeURIComponent(r.order.publicOrderRef)}`} className="text-admin-800 underline">
                  {r.order.publicOrderRef}
                </Link>
              ) : (
                "—"
              )}{" "}
              · {r.status} · refund {r.refundStatus} · {r.user?.email ?? "—"}
            </p>
            <p className="mt-1 text-zinc-600">Reason: {r.reason}</p>
            {canMutate ? (
              <form action={updateReturnRequestAdminForm} className="mt-3 grid gap-2 border-t border-zinc-100 pt-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={r.id} />
                <label className="text-xs text-zinc-600">
                  Status
                  <select name="status" defaultValue={r.status} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
                    {RETURN_REQUEST_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-zinc-600">
                  Refund status
                  <select name="refundStatus" defaultValue={r.refundStatus ?? "NONE"} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
                    {REFUND_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-zinc-600">
                  Refund amount (INR)
                  <input name="refundAmount" type="number" step="0.01" className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-zinc-600">
                  Pickup courier
                  <input name="pickupCourier" className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-zinc-600 sm:col-span-2">
                  Pickup tracking
                  <input name="pickupTrackingNumber" className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-zinc-600 sm:col-span-2">
                  Admin notes
                  <textarea name="adminNotes" rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-zinc-600 sm:col-span-2">
                  Customer notes
                  <textarea name="customerNotes" rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-zinc-600 sm:col-span-2">
                  Internal description
                  <textarea name="description" rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
                </label>
                <button type="submit" className="rounded-full bg-admin-600 px-4 py-2 text-xs font-semibold text-white hover:bg-admin-700">
                  Save
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Read-only for tech support.</p>
            )}
          </li>
        ))}
      </ul>
      <Pager tab={tab} page={page} total={count ?? 0} />
    </div>
  );
}

function TabBar({ tab }: { tab: "returns" | "exchanges" }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/admin/returns?tab=returns"
        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
          tab === "returns" ? "bg-admin-100 text-admin-900" : "border border-zinc-200 bg-white text-zinc-700"
        }`}
      >
        Returns
      </Link>
      <Link
        href="/admin/returns?tab=exchanges"
        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
          tab === "exchanges" ? "bg-admin-100 text-admin-900" : "border border-zinc-200 bg-white text-zinc-700"
        }`}
      >
        Exchanges
      </Link>
    </div>
  );
}

function Pager({ tab, page, total }: { tab: string; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const prev = Math.max(1, page - 1);
  const next = Math.min(pages, page + 1);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link className="text-admin-800 underline" href={`/admin/returns?tab=${tab}&page=${prev}`}>
        Previous
      </Link>
      <span className="text-zinc-600">
        Page {page} / {pages}
      </span>
      <Link className="text-admin-800 underline" href={`/admin/returns?tab=${tab}&page=${next}`}>
        Next
      </Link>
    </div>
  );
}
