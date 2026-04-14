"use client";

import type { ProductVariant } from "@prisma/client";
import { useMemo, useState } from "react";

export type VariantRow = { size: string; color: string; quantity: number };

type Props = {
  initial: ProductVariant[];
};

export function ProductVariantFields({ initial }: Props) {
  const [rows, setRows] = useState<VariantRow[]>(() =>
    initial.length > 0
      ? initial.map((v) => ({
          size: v.size,
          color: v.color,
          quantity: v.quantity
        }))
      : [{ size: "", color: "", quantity: 0 }]
  );

  const json = useMemo(() => JSON.stringify(rows), [rows]);

  return (
    <div className="sm:col-span-2">
      <input type="hidden" name="variantsJson" value={json} />
      <label className="text-xs font-semibold text-zinc-600">Stock by size & color</label>
      <p className="mt-1 text-xs text-zinc-500">
        Each row is one option (e.g. Size M + Green). Quantities are separate per row. Empty size/color means a single
        default variant.
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
            <div className="min-w-[100px] flex-1">
              <span className="text-[10px] font-semibold uppercase text-zinc-500">Size</span>
              <input
                className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={row.size}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, size: e.target.value };
                  setRows(next);
                }}
                placeholder="e.g. M"
              />
            </div>
            <div className="min-w-[100px] flex-1">
              <span className="text-[10px] font-semibold uppercase text-zinc-500">Color</span>
              <input
                className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={row.color}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, color: e.target.value };
                  setRows(next);
                }}
                placeholder="e.g. Green"
              />
            </div>
            <div className="w-24">
              <span className="text-[10px] font-semibold uppercase text-zinc-500">Qty</span>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                value={row.quantity}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, quantity: Math.max(0, Number(e.target.value) || 0) };
                  setRows(next);
                }}
              />
            </div>
            <button
              type="button"
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-white"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-2 text-sm font-semibold text-crown-800 underline"
        onClick={() => setRows([...rows, { size: "", color: "", quantity: 0 }])}
      >
        + Add variant row
      </button>
    </div>
  );
}
