"use client";

import { Check, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { useCart } from "@/context/CartContext";

type FeaturedCoupon = { code: string; discountPct: number };

type Props = {
  productIds: string[];
};

export function BagPromoSection({ productIds }: Props) {
  const { couponCode, applyCoupon } = useCart();
  const [code, setCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [featured, setFeatured] = useState<FeaturedCoupon[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const titleId = useId();

  const key = productIds.length ? [...new Set(productIds)].sort().join(",") : "";

  useEffect(() => {
    if (!key) {
      setFeatured([]);
      return;
    }
    let cancelled = false;
    setLoadingFeatured(true);
    void fetch("/api/coupons/featured-for-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: key.split(",") })
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
  }, [key]);

  const tryApply = useCallback(
    async (raw: string) => {
      setCouponMsg(null);
      const r = await applyCoupon(raw);
      if (!r.ok) setCouponMsg(r.message);
      else setCode("");
    },
    [applyCoupon]
  );

  const onSubmitTyped = useCallback(() => {
    void tryApply(code);
  }, [code, tryApply]);

  const onPickCoupon = useCallback(
    async (c: string) => {
      await tryApply(c);
      setModalOpen(false);
    },
    [tryApply]
  );

  return (
    <div className="space-y-4">
      {(featured.length > 0 || loadingFeatured) && (
        <section className="rounded-xl border border-zinc-100 bg-zinc-50/90 p-4" aria-labelledby={titleId}>
          <h3 id={titleId} className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Coupons for your items
          </h3>
          <p className="mt-1 text-xs text-zinc-600">
            Codes your team highlighted on products in this bag — tap one to apply.
          </p>
          {featured.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {featured.slice(0, 6).map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => void onPickCoupon(c.code)}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:border-crown-400 hover:bg-crown-50/60"
                  >
                    {c.code} · {c.discountPct}% off
                  </button>
                </li>
              ))}
            </ul>
          ) : loadingFeatured ? (
            <p className="mt-2 text-xs text-zinc-500">Loading offers…</p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">No highlighted coupons for current items. You can still enter a code manually.</p>
          )}
        </section>
      )}

      <div>
        <label htmlFor="bag-promo-code" className="sr-only">
          Promo code
        </label>
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="relative min-w-[min(100%,12rem)] flex-1">
            <input
              id="bag-promo-code"
              className="w-full rounded-full border border-zinc-300 py-2 pl-3 pr-11 text-sm outline-none ring-crown-500/30 focus:ring-2"
              placeholder="Promo code"
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
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-crown-800 text-white shadow-sm transition hover:bg-crown-900 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Apply promo code"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Show all
          </button>
        </div>
        {couponMsg && <p className="mt-2 text-xs text-red-600">{couponMsg}</p>}
        {couponCode ? (
          <p className="mt-2 text-xs text-zinc-500">Promo is stored with your bag and checked again at checkout.</p>
        ) : null}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[6000] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bag-promo-modal-title"
            className="max-h-[min(70vh,520px)] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <h2 id="bag-promo-modal-title" className="text-sm font-semibold text-zinc-900">
                Available coupons
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="max-h-[min(60vh,440px)] space-y-1 overflow-y-auto p-3">
              {featured.length > 0 ? (
                featured.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => void onPickCoupon(c.code)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-left text-sm transition hover:border-crown-300 hover:bg-crown-50/50"
                    >
                      <span className="font-mono font-semibold text-zinc-900">{c.code}</span>
                      <span className="shrink-0 text-xs font-medium text-crown-800">{c.discountPct}% off</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600">
                  No featured coupons right now. Enter a promo code manually.
                </li>
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type AppliedRowProps = {
  /** When set (e.g. checkout), shown before the remove control. */
  discountAmount?: number | null;
};

export function BagPromoAppliedRow({ discountAmount }: AppliedRowProps = {}) {
  const { couponCode, discountPct, applyCoupon } = useCart();
  if (!couponCode) return null;
  const showAmt = discountAmount != null && Number.isFinite(discountAmount) && discountAmount > 0;
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
