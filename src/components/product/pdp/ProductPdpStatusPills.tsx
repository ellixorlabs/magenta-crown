"use client";

import { memo } from "react";
import { ShieldCheck, Truck } from "lucide-react";

export type ProductPdpStatusPillsProps = {
  inStock: boolean;
  readyToShip: boolean;
};

function ProductPdpStatusPillsInner({ inStock, readyToShip }: ProductPdpStatusPillsProps) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Product availability">
      <li
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm transition-colors ${
          inStock
            ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-900"
            : "border-zinc-200/90 bg-zinc-100 text-zinc-600"
        }`}
      >
        <span className={`text-[10px] ${inStock ? "text-emerald-600" : "text-zinc-400"}`} aria-hidden>
          ●
        </span>
        {inStock ? "In stock" : "Out of stock"}
      </li>
      <li
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm ${
          readyToShip
            ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-900"
            : "border-zinc-200/80 bg-white text-zinc-500"
        }`}
      >
        <Truck className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
        {readyToShip ? "Ready to ship" : "Made to order"}
      </li>
      <li className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-900 shadow-sm">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
        Secure payment
      </li>
    </ul>
  );
}

export const ProductPdpStatusPills = memo(ProductPdpStatusPillsInner);
