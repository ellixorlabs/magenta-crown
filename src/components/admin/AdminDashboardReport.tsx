import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import type {
  AdminDashboardAnalytics,
  AdminKpi,
  CategorySale,
  MonthlyPoint,
  OrderStatusSlice,
  TopProductRow
} from "@/lib/admin-analytics";
import { formatInr } from "@/lib/admin-analytics";

function DeltaBadge({ kpi }: { kpi: AdminKpi }) {
  const p = kpi.delta.pct;
  if (p == null) {
    return <span className="text-xs text-zinc-400">—</span>;
  }
  const good = kpi.positiveGood ? p >= 0 : p <= 0;
  return (
    <span className={good ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-rose-600"}>
      {p >= 0 ? "+" : ""}
      {p.toFixed(0)}% <span className="font-normal text-zinc-500">{kpi.delta.label}</span>
    </span>
  );
}

function KpiCard({ kpi }: { kpi: AdminKpi }) {
  return (
    <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
      <button
        type="button"
        className="absolute right-3 top-3 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        aria-label="More"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{kpi.label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{kpi.value}</p>
      <p className="mt-1 text-xs text-zinc-500">{kpi.sub}</p>
      <div className="mt-3">
        <DeltaBadge kpi={kpi} />
      </div>
    </div>
  );
}

function RevenueLineChart({ data }: { data: MonthlyPoint[] }) {
  const w = 640;
  const h = 260;
  const padX = 44;
  const padY = 28;
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.current, d.previous]));
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const y = (v: number) => padY + innerH - (v / maxVal) * innerH;

  const lineA = data.map((d, i) => `${padX + i * step},${y(d.current)}`).join(" ");
  const lineB = data.map((d, i) => `${padX + i * step},${y(d.previous)}`).join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    label: formatInr(Math.round(maxVal * t)),
    py: padY + innerH - t * innerH
  }));

  return (
    <div className="max-w-full min-w-0 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 max-w-full flex-1">
          <h3 className="text-sm font-semibold text-zinc-900">Revenue trend</h3>
          <p className="break-words text-xs leading-snug text-zinc-500">
            Net revenue (paid & shipped) — last 6 months vs the same month six months earlier
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-2 font-medium text-zinc-700">
            <span className="h-2 w-6 rounded-full bg-emerald-500" /> Current window
          </span>
          <span className="flex items-center gap-2 font-medium text-zinc-700">
            <span className="h-2 w-6 rounded-full bg-admin-600" /> Earlier window
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto max-w-full" role="img" aria-label="Revenue line chart">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <line
            key={t.label}
            x1={padX}
            x2={w - padX}
            y1={t.py}
            y2={t.py}
            stroke="#e4e4e7"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}
        <polygon
          fill="url(#revFill)"
          points={`${padX},${padY + innerH} ${lineA} ${padX + (data.length - 1) * step},${padY + innerH}`}
        />
        <polyline fill="none" stroke="#10b981" strokeWidth="2.5" points={lineA} strokeLinejoin="round" />
        <polyline fill="none" stroke="#7c3aed" strokeWidth="2.5" points={lineB} strokeDasharray="6 4" strokeLinejoin="round" />
        {data.map((d, i) => (
          <text
            key={d.label + i}
            x={padX + i * step}
            y={h - 6}
            textAnchor="middle"
            className="fill-zinc-500 text-[11px] font-medium"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function OrderStatusDonut({ slices }: { slices: OrderStatusSlice[] }) {
  const colors = ["#7c3aed", "#a78bfa", "#c4b5fd", "#94a3b8", "#10b981"];
  const total = slices.reduce((s, x) => s + x.count, 0) || 1;
  let acc = 0;
  const coneParts = slices.map((sl, i) => {
    const start = (acc / total) * 360;
    acc += sl.count;
    const end = (acc / total) * 360;
    return `${colors[i % colors.length]} ${start}deg ${end}deg`;
  });
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Orders by status</h3>
      <p className="mt-0.5 text-xs text-zinc-500">Share of all orders</p>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          className="relative h-40 w-40 shrink-0 rounded-full border-[12px] border-zinc-100 bg-zinc-50"
          style={{
            background: `conic-gradient(${coneParts.join(", ")})`
          }}
        >
          <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Total</span>
            <span className="text-xl font-bold text-zinc-900">{total}</span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-4 text-sm sm:pl-1">
          {slices.map((s, i) => (
            <li key={s.status} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: colors[i % colors.length] }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="font-medium text-zinc-800">{s.status}</span>
                  <span className="shrink-0 tabular-nums text-zinc-600">{s.count}</span>
                </div>
                <p className="mt-0.5 text-xs tabular-nums text-zinc-500">{s.pct.toFixed(0)}% of orders</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CategoryBars({ rows }: { rows: CategorySale[] }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Sales by category</h3>
      <p className="mt-0.5 text-xs text-zinc-500">Net from line items (paid & shipped)</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">No paid orders yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.category}>
              <div className="mb-1 flex justify-between text-xs font-medium text-zinc-700">
                <span className="truncate">{r.category}</span>
                <span className="shrink-0 tabular-nums text-zinc-500">
                  {formatInr(r.amount)} · {r.pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-admin-500 to-admin-600"
                  style={{ width: `${(r.amount / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MonthlyGauge({ target }: { target: AdminDashboardAnalytics["monthlyTarget"] }) {
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Monthly target</h3>
      <p className="mt-0.5 text-xs text-zinc-500">This calendar month vs rolling goal</p>
      <div className="mx-auto mt-5 max-w-xs text-center">
        <p className="text-4xl font-bold tracking-tight text-zinc-900">{target.pct.toFixed(1)}%</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{target.message}</p>
        <div className="mx-auto mt-5 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-admin-500 to-admin-600 transition-all"
            style={{ width: `${Math.min(100, target.pct)}%` }}
          />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 text-center text-[11px]">
        <div>
          <p className="text-zinc-400">Target</p>
          <p className="mt-0.5 font-semibold text-zinc-900">{formatInr(target.target)}</p>
        </div>
        <div>
          <p className="text-zinc-400">Month</p>
          <p className="mt-0.5 font-semibold text-emerald-700">{formatInr(target.monthRevenue)}</p>
        </div>
        <div>
          <p className="text-zinc-400">Today</p>
          <p className="mt-0.5 font-semibold text-admin-800">{formatInr(target.todayRevenue)}</p>
        </div>
      </div>
    </div>
  );
}

function TopProductsTable({ rows }: { rows: TopProductRow[] }) {
  return (
    <div className="max-w-full min-w-0 rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">Top selling products</h3>
          <p className="break-words text-xs text-zinc-500">By revenue from paid & shipped orders</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/admin/inventory"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            View all
          </Link>
        </div>
      </div>
      <div className="hidden md:block md:overflow-x-auto">
        <table className="w-full min-w-0 text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-5 py-3">Product</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3 text-right">Qty</th>
              <th className="px-5 py-3 text-right">Revenue</th>
              <th className="px-5 py-3 text-right">Store</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                  No sales data yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.productId} className="border-b border-zinc-50 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900">{r.name}</p>
                  </td>
                  <td className="px-3 py-3 text-zinc-600">{r.category}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-800">{r.quantity}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-zinc-900">
                    {formatInr(r.revenue)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/product/${r.slug}`}
                      className="text-xs font-semibold text-admin-700 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-zinc-100 md:hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">No sales data yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.productId} className="space-y-2 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-medium leading-snug text-zinc-900">{r.name}</p>
                <p className="shrink-0 font-semibold tabular-nums text-zinc-900">{formatInr(r.revenue)}</p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                <span>{r.category}</span>
                <span className="tabular-nums">Qty {r.quantity}</span>
              </div>
              <Link
                href={`/product/${r.slug}`}
                className="inline-block text-xs font-semibold text-admin-700 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                View in store
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AdminDashboardReport({
  data,
  showStaffNote
}: {
  data: AdminDashboardAnalytics;
  showStaffNote: boolean;
}) {
  return (
    <div className="max-w-full min-w-0 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <RevenueLineChart data={data.revenueTrend} />
          <TopProductsTable rows={data.topProducts} />
        </div>
        <div className="space-y-6">
          <OrderStatusDonut slices={data.orderStatus} />
          <CategoryBars rows={data.categorySales} />
          <MonthlyGauge target={data.monthlyTarget} />
        </div>
      </div>

      {showStaffNote && (
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 p-5 text-sm text-amber-950">
          <strong className="font-semibold">Staff note:</strong> {data.staffNote}
        </div>
      )}
    </div>
  );
}
