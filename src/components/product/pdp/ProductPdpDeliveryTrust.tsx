"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";

type Props = {
  codEnabled?: boolean;
  returnEligible?: boolean;
  exchangeEligible?: boolean;
  returnWindowDays?: number;
  verifiedReviewCount?: number;
  dispatchEstimate?: string;
};

function ProductPdpDeliveryTrustInner({
  codEnabled = true,
  returnEligible = true,
  exchangeEligible = true,
  returnWindowDays = 7,
  verifiedReviewCount = 0,
  dispatchEstimate = "Standard dispatch 2–3 business days; metro delivery usually 3–5 days after ship."
}: Props) {
  const [pin, setPin] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  const onCheck = useCallback(() => {
    const d = pin.replace(/\D/g, "");
    if (d.length !== 6) {
      setHint("Please enter a valid 6-digit pincode.");
      return;
    }
    setHint("Standard delivery in 3–5 business days for most metros. Final date at checkout.");
  }, [pin]);

  const pinDisplay = useMemo(() => pin.replace(/\D/g, "").slice(0, 6), [pin]);

  return (
    <div className="space-y-5 border-t border-zinc-200/70 pt-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Delivery & trust</p>
        <p className="mt-1 text-sm text-zinc-700">{dispatchEstimate}</p>
        {verifiedReviewCount > 0 ? (
          <p className="mt-2 text-xs font-medium text-emerald-900">
            {verifiedReviewCount} verified purchase{verifiedReviewCount === 1 ? "" : "s"} shared feedback on this
            piece.
          </p>
        ) : null}
        <div className="mt-3 flex items-stretch gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder="Enter pincode"
            value={pinDisplay}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              setHint(null);
            }}
            className="min-h-[44px] flex-1 rounded-sm border border-zinc-200/90 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-crown-800/40 focus:ring-1 focus:ring-crown-800/20"
          />
          <button
            type="button"
            onClick={onCheck}
            className="shrink-0 rounded-sm border border-zinc-900/10 bg-zinc-900 px-4 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-zinc-800"
          >
            Check
          </button>
        </div>
        {hint ? <p className="mt-2 text-xs leading-relaxed text-zinc-600">{hint}</p> : null}
      </div>

      <ul className="space-y-3 text-sm text-zinc-700">
        {codEnabled ? (
          <li className="flex gap-2 rounded-lg border border-zinc-100/90 bg-zinc-50/30 px-3 py-2.5 shadow-sm">
            <span className="select-none" aria-hidden>
              💵
            </span>
            <span>Cash on delivery available on eligible orders. Pay the courier when your package arrives.</span>
          </li>
        ) : null}
        <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-zinc-100/90 bg-zinc-50/30 px-3 py-2.5 shadow-sm">
          <span className="select-none" aria-hidden>
            🔄
          </span>
          <span>
            {returnEligible
              ? `Returns within ${returnWindowDays} days on eligible unworn pieces.`
              : "This item is marked non-returnable."}{" "}
            {exchangeEligible ? "Size exchanges may be available where stock allows." : "Exchanges not offered on this SKU."}
          </span>
          <Link
            href="/support/shipping"
            className="text-xs font-semibold text-rose-800 underline decoration-rose-200 underline-offset-4 hover:text-rose-950"
          >
            View policy
          </Link>
        </li>
        <li className="flex gap-2 rounded-lg border border-zinc-100/90 bg-zinc-50/30 px-3 py-2.5 shadow-sm">
          <span className="select-none" aria-hidden>
            🛡
          </span>
          <span>Encrypted checkout and trusted payment partners (UPI / Razorpay).</span>
        </li>
      </ul>
    </div>
  );
}

export const ProductPdpDeliveryTrust = memo(ProductPdpDeliveryTrustInner);
