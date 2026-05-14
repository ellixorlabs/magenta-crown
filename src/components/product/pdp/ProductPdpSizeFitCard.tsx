"use client";

import { memo } from "react";

type Row = { label: string; value: string };

export type ProductPdpSizeFitCardProps = {
  modelNote: string;
  rows: Row[];
};

function ProductPdpSizeFitCardInner({ modelNote, rows }: ProductPdpSizeFitCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200/80 bg-white/80 shadow-sm">
      <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-zinc-100">
        <div className="border-b border-zinc-100 p-4 sm:border-b-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Model fit</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-800">{modelNote}</p>
        </div>
        <div className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Garment notes</p>
          <dl className="mt-3 space-y-2.5">
            {rows.map((r) => (
              <div key={r.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                <dt className="shrink-0 text-xs font-semibold text-zinc-500">{r.label}</dt>
                <dd className="text-sm text-zinc-800">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export const ProductPdpSizeFitCard = memo(ProductPdpSizeFitCardInner);
