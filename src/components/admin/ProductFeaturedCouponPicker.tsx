"use client";

import { useMemo, useState } from "react";

export type CouponOption = { id: string; code: string; discountPct: number; isActive: boolean };

type Props = {
  coupons: CouponOption[];
  selectedIds: string[];
};

export function ProductFeaturedCouponPicker({ coupons, selectedIds }: Props) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(selectedIds));
  const json = useMemo(() => JSON.stringify([...picked]), [picked]);

  return (
    <div className="sm:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
      <input type="hidden" name="featuredCouponIds" value={json} />
      <label className="text-xs font-semibold text-zinc-600">Great offers (PDP)</label>
      <p className="mt-1 text-xs text-zinc-500">
        Choose which active coupons to highlight on this product page. Only coupons marked active in Coupons admin
        apply at checkout.
      </p>
      <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
        {coupons.length === 0 ? (
          <li className="text-zinc-500">No coupons yet — add some under Admin → Coupons.</li>
        ) : (
          coupons.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/80">
                <input
                  type="checkbox"
                  checked={picked.has(c.id)}
                  disabled={!c.isActive}
                  onChange={(e) => {
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      return next;
                    });
                  }}
                />
                <span className="font-mono font-semibold">{c.code}</span>
                <span className="text-zinc-600">{c.discountPct}% off</span>
                {!c.isActive && <span className="text-xs text-zinc-400">(inactive)</span>}
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
