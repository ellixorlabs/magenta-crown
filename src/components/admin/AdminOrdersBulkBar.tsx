"use client";

import { useMemo, useState } from "react";
import { ORDER_STATUSES } from "@/lib/order-domain";
import { bulkSetOrderStatus } from "@/app/admin/(dashboard)/orders/bulk-actions";

type Row = { id: string; publicOrderRef: string | null };

export function AdminOrdersBulkBar({ orders, canMutate }: { orders: Row[]; canMutate: boolean }) {
  const allIds = useMemo(() => orders.map((o) => o.id), [orders]);
  const [selectedAllOnPage, setSelectedAllOnPage] = useState(false);
  const [status, setStatus] = useState<string>("SHIPPED");

  const selectedIds = selectedAllOnPage ? allIds : [];

  if (!canMutate) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="text-xs font-semibold text-crown-800 underline"
          onClick={() => setSelectedAllOnPage(true)}
        >
          Select all on page
        </button>
        <button type="button" className="text-xs font-semibold text-zinc-500 underline" onClick={() => setSelectedAllOnPage(false)}>
          Clear selection
        </button>
        <span className="text-xs text-zinc-500">{selectedIds.length} selected</span>
      </div>
      <form
        action={async (fd) => {
          fd.set("orderIds", selectedIds.join(","));
          await bulkSetOrderStatus(fd);
          setSelectedAllOnPage(false);
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="text-xs font-semibold text-zinc-600">
          Set status
          <select
            name="orderStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {ORDER_STATUSES.filter((s) => s !== "ORDER_PLACED" && s !== "CANCELLED").map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <input type="hidden" name="orderIds" value={selectedIds.join(",")} readOnly />
        <button
          type="submit"
          disabled={selectedIds.length === 0}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          Apply to selected
        </button>
      </form>
      <a
        href="/api/admin/orders/export-csv"
        className="inline-flex items-center rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
      >
        Export CSV (latest 500)
      </a>
    </div>
  );
}
