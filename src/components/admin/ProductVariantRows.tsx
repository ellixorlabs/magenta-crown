"use client";

import { useMemo, useState } from "react";
import { DEFAULT_COLOR } from "@/lib/product-variants";
import type { ProductVariantRow } from "@/lib/db/app-types";

export type VariantRowJson = { size: string; color: string; stock: number; isActive: boolean };

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function displayColorFromDb(c: string) {
  const t = c.trim();
  return t === DEFAULT_COLOR ? "" : t;
}

type Row = VariantRowJson & { key: string };

function rowsFromInitial(initial: ProductVariantRow[]): Row[] {
  if (initial.length === 0) {
    return [{ key: newKey(), size: "", color: "", stock: 0, isActive: true }];
  }
  return initial.map((v) => ({
    key: newKey(),
    size: v.size.trim(),
    color: displayColorFromDb(v.color),
    stock: Math.max(0, v.stock),
    isActive: v.isActive
  }));
}

type Props = { initial: ProductVariantRow[] };

export function ProductVariantRows({ initial }: Props) {
  const [rows, setRows] = useState<Row[]>(() => rowsFromInitial(initial));
  const [customSize, setCustomSize] = useState("");
  const commonSizes = ["XS", "S", "M", "L", "XL", "XXL"];

  const json = useMemo(() => {
    const out: VariantRowJson[] = rows
      .map((r) => ({
        size: r.size.trim(),
        color: r.color.trim(),
        stock: Math.max(0, Math.floor(r.stock)),
        isActive: r.isActive
      }))
      .filter((r) => r.size.length > 0);
    return JSON.stringify(out);
  }, [rows]);

  return (
    <div className="sm:col-span-2">
      <input type="hidden" name="variantsJson" value={json} />
      <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
        <p className="text-xs font-semibold text-zinc-600">Quick sizes</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {commonSizes.map((size) => (
            <button
              key={size}
              type="button"
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  { key: newKey(), size, color: "", stock: 0, isActive: true }
                ])
              }
            >
              + {size}
            </button>
          ))}
          <input
            className="min-w-[130px] rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs"
            placeholder="Custom size"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
          />
          <button
            type="button"
            className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
            onClick={() => {
              const s = customSize.trim();
              if (!s) return;
              setRows((prev) => [
                ...prev,
                { key: newKey(), size: s, color: "", stock: 0, isActive: true }
              ]);
              setCustomSize("");
            }}
          >
            + Add size
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <label className="text-xs font-semibold text-zinc-600">Variants</label>
          <p className="mt-1 text-xs text-zinc-500">
            Each row is one SKU: size + optional color is unique. Stock is per row. Inactive rows are hidden on the
            storefront.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
          onClick={() => setRows((r) => [...r, { key: newKey(), size: "", color: "", stock: 0, isActive: true }])}
        >
          + Add variant
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4"
          >
            <div className="min-w-[100px] flex-1">
              <span className="text-[10px] font-semibold uppercase text-zinc-500">Size</span>
              <input
                className="mt-0.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                value={row.size}
                placeholder="S, M, 32, XL…"
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, size: e.target.value };
                  setRows(next);
                }}
              />
            </div>
            <div className="min-w-[100px] flex-1">
              <span className="text-[10px] font-semibold uppercase text-zinc-500">Color (optional)</span>
              <input
                className="mt-0.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                value={row.color}
                placeholder="Leave blank if not used"
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, color: e.target.value };
                  setRows(next);
                }}
              />
            </div>
            <div className="w-24">
              <span className="text-[10px] font-semibold uppercase text-zinc-500">Stock</span>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm"
                value={row.stock}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, stock: Math.max(0, Number(e.target.value) || 0) };
                  setRows(next);
                }}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                checked={row.isActive}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i]!, isActive: e.target.checked };
                  setRows(next);
                }}
              />
              Enabled
            </label>
            <button
              type="button"
              className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
              onClick={() => {
                setRows((prev) => {
                  const next = prev.filter((_, j) => j !== i);
                  return next.length > 0 ? next : [{ key: newKey(), size: "", color: "", stock: 0, isActive: true }];
                });
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
