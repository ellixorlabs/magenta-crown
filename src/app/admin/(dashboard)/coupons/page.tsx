import Link from "next/link";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { formatInr } from "@/lib/admin-analytics";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { createCoupon, deleteCouponForm, toggleCouponForm } from "./actions";

type Search = { range?: string };

function rangeStartIso(range: string): string | null {
  const now = new Date();
  if (range === "today") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    return s.toISOString();
  }
  if (range === "7") return new Date(now.getTime() - 7 * 86400000).toISOString();
  if (range === "30") return new Date(now.getTime() - 30 * 86400000).toISOString();
  return null;
}

export default async function AdminCouponsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireMerchAdmin("/admin/coupons");
  const sp = await searchParams;
  const rangeRaw = String(sp.range ?? "lifetime").toLowerCase();
  const range = ["today", "7", "30", "lifetime"].includes(rangeRaw) ? rangeRaw : "lifetime";
  const since = rangeStartIso(range);

  const supabase = getSupabaseServiceRoleClient();
  const { data: coupons, error } = await (supabase.from("Coupon") as any).select("*").order("code", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (coupons ?? []) as any[];

  const usageAgg = new Map<string, { uses: number; disc: number; rev: number }>();
  if (since) {
    const { data: usage, error: uErr } = await (supabase.from("CouponUsage") as any)
      .select("couponId,discountAmount,orderTotal")
      .gte("createdAt", since);
    if (uErr) throw new Error(uErr.message);
    for (const u of (usage ?? []) as Array<{ couponId: string; discountAmount: number; orderTotal: number }>) {
      const cur = usageAgg.get(u.couponId) ?? { uses: 0, disc: 0, rev: 0 };
      cur.uses += 1;
      cur.disc += Number(u.discountAmount ?? 0);
      cur.rev += Number(u.orderTotal ?? 0);
      usageAgg.set(u.couponId, cur);
    }
  }

  const rangeLinks = [
    { key: "today", label: "Today" },
    { key: "7", label: "7 days" },
    { key: "30", label: "30 days" },
    { key: "lifetime", label: "Lifetime" }
  ];

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-crown-800 underline">
        ← Admin home
      </Link>
      <h2 className="text-xl font-semibold text-zinc-900">Discount coupons</h2>
      <p className="text-sm text-zinc-600">
        Codes match at checkout. Analytics below count <strong>completed</strong> orders only (paid online or COD delivered) — same rules as the coupon ledger.
      </p>

      <div className="flex flex-wrap gap-2">
        {rangeLinks.map((r) => (
          <Link
            key={r.key}
            href={`/admin/coupons?range=${encodeURIComponent(r.key)}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              range === r.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <form action={createCoupon} className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div>
          <label className="text-xs font-semibold text-zinc-600">Code</label>
          <input name="code" required className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm uppercase" />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Discount %</label>
          <input
            name="discountPct"
            type="number"
            step="0.1"
            min="1"
            max="100"
            required
            className="mt-1 w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked className="rounded" />
          Active
        </label>
        <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          Add coupon
        </button>
      </form>

      <ul className="space-y-3">
        {rows.map((c: any) => {
          const win = usageAgg.get(c.id);
          const uses = range === "lifetime" ? Number(c.totalUses ?? 0) : win?.uses ?? 0;
          const rev = range === "lifetime" ? Number(c.totalRevenueGenerated ?? 0) : win?.rev ?? 0;
          const disc = range === "lifetime" ? Number(c.totalDiscountGiven ?? 0) : win?.disc ?? 0;
          const uniq = range === "lifetime" ? Number(c.uniqueCustomersUsed ?? 0) : null;
          const last = range === "lifetime" && c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString() : null;
          return (
            <li key={c.id} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-mono font-semibold">{c.code}</span>
                  <span className="ml-3 text-zinc-600">{c.discountPct}% off</span>
                  <span className={`ml-3 text-xs ${c.isActive ? "text-green-600" : "text-zinc-400"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                  <div className="mt-2 grid gap-x-6 gap-y-1 text-xs text-zinc-600 sm:grid-cols-2">
                    <span>
                      Uses: <strong className="text-zinc-900">{uses}</strong>
                    </span>
                    <span>
                      Revenue: <strong className="text-zinc-900">{formatInr(rev)}</strong>
                    </span>
                    <span>
                      Discount given: <strong className="text-zinc-900">{formatInr(disc)}</strong>
                    </span>
                    {uniq != null ? (
                      <span>
                        Unique customers: <strong className="text-zinc-900">{uniq}</strong>
                      </span>
                    ) : null}
                    {last ? (
                      <span className="sm:col-span-2">
                        Last use: <strong className="text-zinc-900">{last}</strong>
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={toggleCouponForm}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="next" value={String(!c.isActive)} />
                    <button type="submit" className="text-xs text-crown-800 underline">
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  <form action={deleteCouponForm}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="text-xs text-red-600 underline">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
