"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { memo } from "react";
import type { ProductPdp, ProductPdpPurchaseState } from "@/components/product/pdp/use-product-pdp-purchase";
import { SizeChartModal } from "@/components/product/SizeChartModal";

type Props = {
  product: ProductPdp;
  purchase: ProductPdpPurchaseState;
  reviewAvg: number | null;
  reviewCount: number;
  /** Luxury PDP: borderless sections; legacy: bordered card */
  variant?: "luxury" | "legacy";
};

function ProductPdpPurchaseBlockInner({ product, purchase, reviewAvg, reviewCount, variant = "luxury" }: Props) {
  const p = purchase;

  const {
    isStaff,
    price,
    singleDefault,
    sizeRows,
    colorRows,
    showSizeUi,
    showColorUi,
    showSizeChart,
    effectiveSizeChartUrl,
    sizeChartOpen,
    setSizeChartOpen,
    selectedSize,
    setSelectedSize,
    selectedColor,
    setSelectedColor,
    selectedVariant,
    available,
    inBag,
    remaining,
    lineKey,
    showOtherColorHint,
    totalSellable,
    offPct,
    offers,
    canBuy,
    pushItemsToCart,
    goBuyNow,
    updateQuantity,
    router,
    pricingNote,
    colorDim
  } = p;

  if (isStaff) {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-6 text-sm text-amber-950 shadow-sm">
        <p className="font-medium">Staff preview — ordering is disabled.</p>
        <p className="text-amber-900/90">
          Use the storefront to review products; manage stock in{" "}
          <Link href="/admin/inventory" className="font-semibold text-crown-900 underline">
            Admin → Inventory
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!singleDefault && totalSellable <= 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-semibold tracking-tight text-crown-900">Rs {price}</span>
          {product.discountedPrice != null && (
            <span className="text-base text-zinc-400 line-through">Rs {product.mrp}</span>
          )}
          {offPct != null ? (
            <span className="rounded-full bg-rose-100/90 px-2.5 py-0.5 text-xs font-semibold text-rose-800 shadow-sm">
              {offPct}% off
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium text-zinc-600">This piece is currently unavailable.</p>
      </div>
    );
  }

  const luxury = variant === "luxury";
  const labelCls = luxury
    ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500"
    : "text-xs font-semibold uppercase tracking-wider text-zinc-500";
  const chipBase =
    "min-w-[2.75rem] rounded-lg border px-3 py-2.5 text-sm font-medium transition duration-200 ease-out";
  const chipSel = "border-crown-900 bg-crown-900 text-white shadow-md";
  const chipIdle = "border-zinc-200/90 bg-white text-zinc-800 shadow-sm hover:border-zinc-300";
  const chipDis = "cursor-not-allowed border-zinc-100 bg-zinc-100 text-zinc-400 line-through";

  const wrapCls = luxury ? "space-y-7" : "space-y-4 rounded-2xl border border-zinc-200 bg-white p-6";

  return (
    <div className={wrapCls}>
      {!luxury && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-crown-800">Rs {price}</span>
              {product.discountedPrice != null && (
                <span className="text-lg text-zinc-400 line-through">Rs {product.mrp}</span>
              )}
              {offPct != null ? (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                  {offPct}% OFF
                </span>
              ) : null}
            </div>
            {reviewCount > 0 && reviewAvg != null && (
              <div className="text-right text-sm text-zinc-700">
                <span className="font-semibold text-amber-600">★ {reviewAvg.toFixed(1)}</span>
                <span className="text-zinc-500"> ({reviewCount})</span>
              </div>
            )}
          </div>
          {product.prepaidOfferText?.trim() ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
              {product.prepaidOfferText.trim()}
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-zinc-500">{pricingNote}</p>
          {offers.length > 0 && (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/90 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Great offers</p>
              <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
                {offers.map((c) => (
                  <li key={c.code} className="flex justify-between gap-2">
                    <span className="font-mono font-semibold">{c.code}</span>
                    <span className="text-zinc-600">{c.discountPct}% off</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {showColorUi && (
        <div>
          <label className={labelCls}>Select color</label>
          <div className="mt-3 flex flex-wrap gap-2">
            {colorRows.map((row) => {
              const isSel = selectedColor === row.color;
              return (
                <button
                  key={`${row.label}-${row.color}`}
                  type="button"
                  disabled={row.disabled}
                  onClick={() => {
                    if (row.disabled) return;
                    setSelectedColor(row.color);
                  }}
                  className={`${chipBase} ${
                    row.disabled ? chipDis : isSel ? chipSel : chipIdle
                  } ${luxury ? "rounded-full px-5" : "rounded-full px-4"}`}
                >
                  {row.label}
                </button>
              );
            })}
          </div>
          {showOtherColorHint && (
            <p className="mt-2 text-sm text-crown-800">This size is available in other colors.</p>
          )}
        </div>
      )}

      {showSizeUi && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className={labelCls}>Size</label>
            {showSizeChart && effectiveSizeChartUrl && (
              <button
                type="button"
                onClick={() => setSizeChartOpen(true)}
                className="text-xs font-semibold text-rose-700 underline decoration-rose-300 underline-offset-4 transition hover:text-rose-900"
              >
                Size guide
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sizeRows.map((row) => {
              const isSel = selectedSize === row.size;
              return (
                <button
                  key={row.size}
                  type="button"
                  disabled={row.disabled}
                  onClick={() => {
                    if (row.disabled) return;
                    setSelectedSize(row.size);
                  }}
                  className={`${chipBase} ${row.disabled ? chipDis : isSel ? chipSel : chipIdle}`}
                >
                  {row.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!singleDefault && (!selectedVariant || available <= 0) && (
        <p className="text-sm font-medium text-zinc-600">Select a size{colorDim ? " and color" : ""} to continue.</p>
      )}

      {canBuy && available > 0 && remaining <= 6 && remaining > 0 ? (
        <p className="text-xs font-medium tracking-wide text-sky-800">
          {remaining} left for this selection
        </p>
      ) : null}

      {luxury && product.prepaidOfferText?.trim() ? (
        <p className="rounded-xl border border-emerald-100/80 bg-emerald-50/50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-sm">
          {product.prepaidOfferText.trim()}
        </p>
      ) : null}

      {luxury && offers.length > 0 && (
        <div className="rounded-xl border border-zinc-100/90 bg-zinc-50/40 px-4 py-3 shadow-sm">
          <p className={labelCls}>Exclusive offers</p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
            {offers.map((c) => (
              <li key={c.code} className="flex justify-between gap-2">
                <span className="font-mono font-semibold">{c.code}</span>
                <span className="text-zinc-600">{c.discountPct}% off</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {inBag === 0 ? (
          <button
            type="button"
            onClick={pushItemsToCart}
            disabled={!canBuy || remaining <= 0}
            className={`w-full py-3.5 text-sm font-semibold tracking-wide shadow-md transition duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-45 ${
              luxury
                ? "rounded-sm bg-gradient-to-b from-[#c9a07a] to-[#b8895f] text-white hover:from-[#d1aa84] hover:to-[#c1946a]"
                : "rounded-full bg-crown-800 text-white hover:bg-crown-900 sm:max-w-md"
            }`}
          >
            {!canBuy || remaining <= 0 ? "Select options" : "Add to bag"}
          </button>
        ) : (
          <div className={`flex w-full flex-wrap items-center gap-2 ${luxury ? "" : "max-w-md"}`}>
            <div className="inline-flex min-w-[200px] flex-1 items-stretch self-start rounded-full border border-zinc-200/90 bg-white shadow-sm">
              <button
                type="button"
                aria-label="Decrease quantity in bag"
                onClick={() => updateQuantity(lineKey, inBag - 1)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-l-full text-zinc-800 transition hover:bg-zinc-50"
              >
                <Minus className="h-5 w-5" strokeWidth={2} />
              </button>
              <span className="flex min-w-[3rem] flex-1 items-center justify-center border-x border-zinc-200/90 px-2 text-base font-semibold tabular-nums text-zinc-900">
                {inBag}
              </span>
              <button
                type="button"
                aria-label="Increase quantity in bag"
                disabled={inBag >= available}
                onClick={() => updateQuantity(lineKey, inBag + 1)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-full text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <button
              type="button"
              disabled={inBag <= 0}
              onClick={() => router.push("/checkout")}
              className="min-h-[44px] min-w-[200px] flex-1 rounded-full border border-zinc-200/90 bg-white px-6 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Proceed to checkout
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={!canBuy || (remaining <= 0 && inBag <= 0)}
          onClick={goBuyNow}
          className={`w-full border py-3 text-sm font-semibold transition duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-45 ${
            luxury
              ? "rounded-sm border-crown-900/25 bg-white text-crown-900 shadow-sm hover:bg-crown-50/80"
              : "rounded-full border-crown-800 text-crown-900 hover:bg-crown-50 sm:max-w-md"
          }`}
        >
          Buy now
        </button>
        {!luxury ? (
          <p className="text-xs text-zinc-500">Choose UPI or cash on delivery at checkout.</p>
        ) : (
          <p className="text-xs leading-relaxed text-zinc-500">UPI or cash on delivery at checkout.</p>
        )}
      </div>

      {!luxury && (
        <p className="text-xs text-zinc-500">Delivery & returns: Free shipping over Rs 5,000. Easy exchanges within 14 days.</p>
      )}

      {showSizeChart && effectiveSizeChartUrl && (
        <SizeChartModal
          open={sizeChartOpen}
          imageUrl={effectiveSizeChartUrl}
          productName={product.name}
          onClose={() => setSizeChartOpen(false)}
        />
      )}
    </div>
  );
}

export const ProductPdpPurchaseBlock = memo(ProductPdpPurchaseBlockInner);
