"use client";

import { Check, TicketPercent, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";

type FeaturedCoupon = { code: string; discountPct: number };

type Props = {
  /** Cart product IDs — used when loading featured promos for the picker. */
  productIds?: string[];
};

export function BagPromoSection({ productIds = [] }: Props) {
  const { couponCode, applyCoupon } = useCart();
  const inputId = useId();
  const [code, setCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [featured, setFeatured] = useState<FeaturedCoupon[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const tryApply = useCallback(
    async (raw: string) => {
      setCouponMsg(null);
      const r = await applyCoupon(raw);
      if (!r.ok) setCouponMsg(r.message);
      else {
        setCode("");
        setPickerOpen(false);
      }
    },
    [applyCoupon]
  );

  const onSubmitTyped = useCallback(() => {
    void tryApply(code);
  }, [code, tryApply]);

  const pickerKey = productIds.length ? [...new Set(productIds)].sort().join(",") : "";

  useEffect(() => {
    if (!pickerOpen) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    if (!pickerKey) {
      setFeatured([]);
      setLoadingFeatured(false);
      return;
    }
    let cancelled = false;
    setLoadingFeatured(true);
    void fetch("/api/coupons/featured-for-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: pickerKey.split(",") })
    })
      .then((r) => r.json())
      .then((d: { coupons?: FeaturedCoupon[] }) => {
        if (!cancelled) setFeatured(Array.isArray(d.coupons) ? d.coupons : []);
      })
      .catch(() => {
        if (!cancelled) setFeatured([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFeatured(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, pickerKey]);

  return (
    <div ref={wrapRef} className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        Promo code
      </label>
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            className="w-full rounded-full border border-zinc-300 py-1.5 pl-2.5 pr-9 text-xs outline-none ring-crown-500/30 focus:ring-2"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmitTyped();
              }
            }}
          />
          <button
            type="button"
            onClick={onSubmitTyped}
            disabled={!code.trim()}
            className="absolute right-0.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-crown-800 text-white shadow-sm transition hover:bg-crown-900 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Apply promo code"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 shadow-sm transition hover:border-crown-400 hover:bg-crown-50/60 hover:text-crown-900"
            aria-label="Show available promos for items in your bag"
            aria-expanded={pickerOpen}
            aria-haspopup="listbox"
          >
            <TicketPercent className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          {pickerOpen ? (
            <div
              role="listbox"
              aria-label="Available promo codes"
              className="absolute right-0 top-[calc(100%+6px)] z-[100] max-h-52 w-[min(calc(100vw-2rem),240px)] overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/[0.06]"
            >
              {!pickerKey ? (
                <p className="px-3 py-2 text-xs text-zinc-500">Add items to use promos.</p>
              ) : loadingFeatured ? (
                <p className="px-3 py-2 text-xs text-zinc-500">Loading…</p>
              ) : featured.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-500">No featured promos for these items.</p>
              ) : (
                featured.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    role="option"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-zinc-50"
                    onClick={() => void tryApply(c.code)}
                  >
                    <span className="font-mono font-semibold text-zinc-900">{c.code}</span>
                    <span className="shrink-0 tabular-nums text-crown-800">{c.discountPct}% off</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
      {couponMsg ? <p className="text-xs text-red-600">{couponMsg}</p> : null}
      {couponCode ? (
        <p className="text-xs text-zinc-500">Promo is stored with your bag and checked again at checkout.</p>
      ) : null}
    </div>
  );
}

type AppliedRowProps = {
  discountAmount?: number | null;
  layout?: "default" | "bill";
};

export function BagPromoAppliedRow({ discountAmount, layout = "default" }: AppliedRowProps = {}) {
  const { couponCode, discountPct, applyCoupon } = useCart();
  if (!couponCode) return null;
  const showAmt = discountAmount != null && Number.isFinite(discountAmount) && discountAmount > 0;

  if (layout === "bill") {
    return (
      <div className="flex items-start justify-between gap-4 text-sm">
        <div className="min-w-0 pt-0.5">
          <span className="text-zinc-600">Promotional discount</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="font-mono font-semibold text-zinc-700">{couponCode}</span>
            {discountPct > 0 ? <span>({discountPct}%)</span> : null}
            <button
              type="button"
              onClick={() => void applyCoupon("")}
              className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Remove
            </button>
          </span>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {showAmt ? (
            <span className="text-base font-semibold tabular-nums text-green-700">− Rs {discountAmount.toFixed(0)}</span>
          ) : (
            <span className="text-xs font-medium text-green-700">Applied</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-2 text-sm text-green-700">
      <span className="min-w-0">
        Promo ({couponCode}
        {discountPct > 0 ? ` - ${discountPct}%` : ""}) <span className="font-medium">Applied</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {showAmt ? <span className="tabular-nums">− Rs {discountAmount.toFixed(0)}</span> : null}
        <button
          type="button"
          onClick={() => void applyCoupon("")}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-green-200 bg-white text-green-800 transition hover:bg-green-50"
          aria-label="Remove promo code"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </span>
    </div>
  );
}
