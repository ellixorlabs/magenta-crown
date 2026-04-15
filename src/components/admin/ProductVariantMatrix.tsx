"use client";

import type { ProductVariant } from "@prisma/client";
import { useMemo, useState } from "react";
import { DEFAULT_COLOR, DEFAULT_SIZE } from "@/lib/product-variants";

export type FlatVariantRow = { color: string; size: string; stock: number; isActive: boolean };

type ColorBlock = {
  key: string;
  color: string;
  sizes: { key: string; size: string; stock: number; isActive: boolean }[];
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function groupFromInitial(initial: ProductVariant[]): ColorBlock[] {
  if (initial.length === 0) {
    return [{ key: newKey(), color: "", sizes: [{ key: newKey(), size: "", stock: 0, isActive: true }] }];
  }
  const byColor = new Map<string, ProductVariant[]>();
  for (const v of initial) {
    const c = v.color.trim();
    const list = byColor.get(c) ?? [];
    list.push(v);
    byColor.set(c, list);
  }
  return [...byColor.entries()].map(([color, rows]) => ({
    key: newKey(),
    color,
    sizes: rows.map((r) => ({
      key: newKey(),
      size: r.size.trim(),
      stock: Math.max(0, r.stock),
      isActive: r.isActive
    }))
  }));
}

function flatten(blocks: ColorBlock[]): FlatVariantRow[] {
  const out: FlatVariantRow[] = [];
  for (const b of blocks) {
    const colorRaw = b.color.trim();
    const color = colorRaw || DEFAULT_COLOR;
    for (const s of b.sizes) {
      const sizeRaw = s.size.trim();
      const size = sizeRaw || DEFAULT_SIZE;
      out.push({
        color,
        size,
        stock: Math.max(0, Math.floor(s.stock)),
        isActive: s.isActive
      });
    }
  }
  return out;
}

type Props = {
  initial: ProductVariant[];
};

export function ProductVariantMatrix({ initial }: Props) {
  const [blocks, setBlocks] = useState<ColorBlock[]>(() => groupFromInitial(initial));

  const json = useMemo(() => JSON.stringify(flatten(blocks)), [blocks]);

  return (
    <div className="sm:col-span-2">
      <input type="hidden" name="variantsJson" value={json} />
      <label className="text-xs font-semibold text-zinc-600">Variants (color → sizes → stock)</label>
      <p className="mt-1 text-xs text-zinc-500">
        Add a color, then add one row per size. Stock is per color and size. Uncheck &quot;Active&quot; to hide a SKU from
        the storefront.
      </p>
      <div className="mt-4 space-y-4">
        {blocks.map((block, bi) => (
          <div key={block.key} className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <span className="text-[10px] font-semibold uppercase text-zinc-500">Color name</span>
                <input
                  className="mt-0.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={block.color}
                  placeholder="e.g. Ruby Red"
                  onChange={(e) => {
                    const next = [...blocks];
                    next[bi] = { ...next[bi]!, color: e.target.value };
                    setBlocks(next);
                  }}
                />
              </div>
              <button
                type="button"
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                onClick={() => setBlocks(blocks.filter((_, i) => i !== bi))}
              >
                Remove color
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <span className="text-[10px] font-semibold uppercase text-zinc-500">Sizes for this color</span>
              {block.sizes.map((row, si) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-100 bg-white/90 p-3"
                >
                  <div className="min-w-[80px] flex-1">
                    <span className="text-[10px] font-semibold uppercase text-zinc-500">Size</span>
                    <input
                      className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                      value={row.size}
                      placeholder="S, M, L…"
                      onChange={(e) => {
                        const next = [...blocks];
                        const sizes = [...next[bi]!.sizes];
                        sizes[si] = { ...sizes[si]!, size: e.target.value };
                        next[bi] = { ...next[bi]!, sizes };
                        setBlocks(next);
                      }}
                    />
                  </div>
                  <div className="w-24">
                    <span className="text-[10px] font-semibold uppercase text-zinc-500">Stock</span>
                    <input
                      type="number"
                      min={0}
                      className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                      value={row.stock}
                      onChange={(e) => {
                        const next = [...blocks];
                        const sizes = [...next[bi]!.sizes];
                        sizes[si] = { ...sizes[si]!, stock: Math.max(0, Number(e.target.value) || 0) };
                        next[bi] = { ...next[bi]!, sizes };
                        setBlocks(next);
                      }}
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 pb-1 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(e) => {
                        const next = [...blocks];
                        const sizes = [...next[bi]!.sizes];
                        sizes[si] = { ...sizes[si]!, isActive: e.target.checked };
                        next[bi] = { ...next[bi]!, sizes };
                        setBlocks(next);
                      }}
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                    onClick={() => {
                      const next = [...blocks];
                      const sizes = next[bi]!.sizes.filter((_, j) => j !== si);
                      next[bi] = { ...next[bi]!, sizes: sizes.length > 0 ? sizes : [{ key: newKey(), size: "", stock: 0, isActive: true }] };
                      setBlocks(next);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-crown-800 underline"
              onClick={() => {
                const next = [...blocks];
                next[bi] = {
                  ...next[bi]!,
                  sizes: [...next[bi]!.sizes, { key: newKey(), size: "", stock: 0, isActive: true }]
                };
                setBlocks(next);
              }}
            >
              + Add size
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 text-sm font-semibold text-crown-800 underline"
        onClick={() =>
          setBlocks([
            ...blocks,
            { key: newKey(), color: "", sizes: [{ key: newKey(), size: "", stock: 0, isActive: true }] }
          ])
        }
      >
        + Add color
      </button>
    </div>
  );
}
