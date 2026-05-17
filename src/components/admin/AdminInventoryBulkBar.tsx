"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bulkSetProductStatus } from "@/app/admin/(dashboard)/inventory/bulk-actions";

type Row = { id: string };

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Set active (storefront)" },
  { value: "DRAFT", label: "Set draft" },
  { value: "ARCHIVED", label: "Archive" },
  { value: "SOLD_OUT", label: "Mark sold out" }
] as const;

export function AdminInventoryBulkBar({
  products,
  canMutate,
  lowStockHref,
  lowStockActive
}: {
  products: Row[];
  canMutate: boolean;
  lowStockHref: string;
  lowStockActive: boolean;
}) {
  const allIds = useMemo(() => products.map((p) => p.id), [products]);
  const [selectedAllOnPage, setSelectedAllOnPage] = useState(false);
  const [status, setStatus] = useState<string>("ACTIVE");
  const selectedIds = selectedAllOnPage ? allIds : [];

  if (!canMutate) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
      <BulkControlsRow
        selectedCount={selectedIds.length}
        onSelectAll={() => setSelectedAllOnPage(true)}
        onClear={() => setSelectedAllOnPage(false)}
        lowStockHref={lowStockHref}
        lowStockActive={lowStockActive}
      />
      <BulkStatusForm
        status={status}
        onStatusChange={setStatus}
        selectedIds={selectedIds}
        onApplied={() => setSelectedAllOnPage(false)}
      />
    </div>
  );
}

function BulkControlsRow({
  selectedCount,
  onSelectAll,
  onClear,
  lowStockHref,
  lowStockActive
}: {
  selectedCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  lowStockHref: string;
  lowStockActive: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="text-xs font-semibold text-crown-800 underline" onClick={onSelectAll}>
        Select visible
      </button>
      <button type="button" className="text-xs font-semibold text-zinc-500 underline" onClick={onClear}>
        Clear
      </button>
      <span className="text-xs text-zinc-500">{selectedCount} selected</span>
      <Link
        href={lowStockHref}
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          lowStockActive ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300" : "bg-zinc-100 text-zinc-700"
        }`}
      >
        Low stock (≤8)
      </Link>
    </div>
  );
}

function BulkStatusForm({
  status,
  onStatusChange,
  selectedIds,
  onApplied
}: {
  status: string;
  onStatusChange: (s: string) => void;
  selectedIds: string[];
  onApplied: () => void;
}) {
  return (
    <form
      action={async (fd) => {
        fd.set("productIds", selectedIds.join(","));
        await bulkSetProductStatus(fd);
        onApplied();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="text-xs font-semibold text-zinc-600">
        Bulk action
        <select
          name="productStatus"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name="productIds" value={selectedIds.join(",")} readOnly />
      <button
        type="submit"
        disabled={selectedIds.length === 0}
        className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
      >
        Apply
      </button>
    </form>
  );
}
