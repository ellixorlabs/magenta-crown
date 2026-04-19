"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Coupon, Product, ProductVariant } from "@prisma/client";
import { makeLineKey } from "@/lib/cart-line";
import { getProductDisplayImage } from "@/lib/product-image-display";
import { useCart } from "@/context/CartContext";
import { getVariantAvailable, isSingleDefaultSku, lineInBagQuantity } from "@/lib/variant-stock";
import {
  cartColorFromVariant,
  colorsForSize,
  findVariant,
  getProductTotalStock,
  hasColorDimension,
  normPart,
  sizeAvailableInOtherColors,
  sizeRowsForPdp,
  type VariantForUi
} from "@/lib/product-variants";
import { SizeChartModal } from "@/components/product/SizeChartModal";

type FeaturedCoupon = { coupon: Pick<Coupon, "code" | "discountPct" | "isActive"> };

export type ProductPdp = Product & {
  variants: ProductVariant[];
  featuredCoupons?: FeaturedCoupon[];
  sizeChartImageUrl?: string | null;
  codEnabled?: boolean;
  prepaidOfferText?: string | null;
  pricingFootnote?: string | null;
};

type Props = {
  product: ProductPdp;
  reviewAvg: number | null;
  reviewCount: number;
};

function pctOff(mrp: number, sale: number | null | undefined) {
  if (sale == null || sale >= mrp || mrp <= 0) return null;
  return Math.round(((mrp - sale) / mrp) * 100);
}

export function AddToCartSection({ product, reviewAvg, reviewCount }: Props) {
  const router = useRouter();
  const variants = product.variants as VariantForUi[];
  const [uiReady, setUiReady] = useState(false);
  const { data: session } = useSession();
  const { addItem, items, updateQuantity, clearCart } = useCart();

  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setUiReady(true);
  }, []);

  const isStaff =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUB_ADMIN" ||
    session?.user?.role === "TECH_SUPPORT";

  const price = product.discountedPrice ?? product.mrp;
  const singleDefault = useMemo(() => isSingleDefaultSku(product.variants), [product.variants]);
  const colorDim = useMemo(() => hasColorDimension(variants), [variants]);

  const sizeRows = useMemo(() => sizeRowsForPdp(variants), [variants]);

  useEffect(() => {
    if (singleDefault) return;
    if (sizeRows.length === 0) {
      setSelectedSize("");
      return;
    }
    setSelectedSize((s) => {
      if (s && sizeRows.some((r) => r.size === s && !r.disabled)) return s;
      const first = sizeRows.find((r) => !r.disabled);
      return first?.size ?? sizeRows[0]!.size;
    });
  }, [sizeRows, singleDefault]);

  const colorRows = useMemo(
    () => (selectedSize ? colorsForSize(selectedSize, variants) : []),
    [selectedSize, variants]
  );

  useEffect(() => {
    if (singleDefault) return;
    if (!colorDim) {
      setSelectedColor("");
      return;
    }
    if (colorRows.length === 0) {
      setSelectedColor("");
      return;
    }
    setSelectedColor((c) => {
      const match = colorRows.find((r) => r.color === c && !r.disabled);
      if (match) return match.color;
      const first = colorRows.find((r) => !r.disabled);
      return first?.color ?? colorRows[0]!.color;
    });
  }, [colorRows, colorDim, singleDefault]);

  const selectedVariant = useMemo(() => {
    if (singleDefault) return product.variants[0];
    if (!selectedSize) return undefined;
    if (!colorDim) {
      return findVariant(variants, "", selectedSize);
    }
    return findVariant(variants, selectedColor, selectedSize);
  }, [singleDefault, product.variants, variants, colorDim, selectedColor, selectedSize]);

  const lineSize = singleDefault ? normPart(product.variants[0]?.size) : normPart(selectedSize);
  const lineColor = singleDefault ? cartColorFromVariant(product.variants[0]) : cartColorFromVariant(selectedVariant);

  const available = useMemo(() => {
    if (singleDefault) {
      return getVariantAvailable(product.variants, "", "");
    }
    if (!colorDim) {
      return getVariantAvailable(product.variants, selectedSize, "");
    }
    return getVariantAvailable(product.variants, selectedSize, selectedColor);
  }, [product.variants, singleDefault, colorDim, selectedSize, selectedColor]);

  const inBag = lineInBagQuantity(items, product.id, lineSize, lineColor);
  const remaining = Math.max(0, available - inBag);

  useEffect(() => {
    setQty((q) => {
      if (remaining <= 0) return 1;
      return Math.min(Math.max(1, q), remaining);
    });
  }, [remaining, selectedVariant?.id]);

  const lineKey = useMemo(
    () => makeLineKey(product.id, lineSize, lineColor),
    [product.id, lineSize, lineColor]
  );

  const { url: img } = getProductDisplayImage(product);

  const showSizeUi = !singleDefault && sizeRows.length > 0;
  const showColorUi = !singleDefault && colorDim && selectedSize && colorRows.length > 0;
  const showSizeChart = Boolean(product.sizeChartImageUrl?.trim());

  const currentColorRow = colorRows.find((r) => r.color === selectedColor);
  const showOtherColorHint =
    colorDim &&
    Boolean(selectedSize && selectedColor) &&
    Boolean(currentColorRow?.disabled) &&
    sizeAvailableInOtherColors(selectedColor, selectedSize, variants);

  const totalSellable = getProductTotalStock(variants);
  const offPct = pctOff(product.mrp, product.discountedPrice);

  const offers = useMemo(
    () =>
      (product.featuredCoupons ?? [])
        .map((x) => x.coupon)
        .filter((c) => c.isActive),
    [product.featuredCoupons]
  );

  const canBuy = uiReady && (singleDefault || (Boolean(selectedVariant) && available > 0));

  const bumpQty = (d: number) => {
    setQty((q) => {
      if (remaining <= 0) return 1;
      const cap = remaining;
      const next = q + d;
      return Math.min(cap, Math.max(1, next));
    });
  };

  const pushItemsToCart = useCallback(() => {
    if (!selectedVariant && !singleDefault) return;
    const vid = singleDefault ? product.variants[0]?.id : selectedVariant?.id;
    if (!vid) return;
    const q = Math.min(qty, Math.max(1, remaining));
    if (remaining <= 0) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price,
      quantity: q,
      imageUrl: img,
      size: lineSize || undefined,
      color: lineColor || undefined,
      variantId: vid,
      maxStock: available
    });
  }, [
    addItem,
    available,
    img,
    lineColor,
    lineSize,
    price,
    product.id,
    product.name,
    product.slug,
    qty,
    remaining,
    selectedVariant,
    singleDefault,
    product.variants
  ]);

  const goCheckout = (pm: string) => {
    clearCart();
    const vid = singleDefault ? product.variants[0]?.id : selectedVariant?.id;
    if (!vid) return;
    const q = Math.min(qty, Math.max(1, remaining));
    if (remaining <= 0) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price,
      quantity: q,
      imageUrl: img,
      size: lineSize || undefined,
      color: lineColor || undefined,
      variantId: vid,
      maxStock: available
    });
    router.push(`/checkout?pm=${encodeURIComponent(pm)}`);
  };

  if (isStaff) {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-6 text-sm text-amber-950">
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
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-semibold text-crown-800">Rs {price}</span>
          {product.discountedPrice != null && (
            <span className="text-lg text-zinc-400 line-through">Rs {product.mrp}</span>
          )}
          {offPct != null ? (
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
              {offPct}% OFF
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium text-zinc-600">This item is currently out of stock.</p>
      </div>
    );
  }

  const pricingNote =
    product.pricingFootnote?.trim() ||
    "Product is inclusive of all taxes. Shipping will be calculated during checkout.";

  const codOk = product.codEnabled !== false;

  return (
    <div
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
      aria-busy={!uiReady}
      data-add-to-cart-ready={uiReady ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-semibold text-crown-800">Rs {price}</span>
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
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">{product.prepaidOfferText.trim()}</p>
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

      {showSizeUi && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Size</label>
            {showSizeChart && product.sizeChartImageUrl && (
              <button
                type="button"
                onClick={() => setSizeChartOpen(true)}
                className="text-xs font-semibold text-crown-800 underline underline-offset-2"
              >
                Size chart
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizeRows.map((row) => {
              const isSel = selectedSize === row.size;
              return (
                <button
                  key={row.size}
                  type="button"
                  disabled={!uiReady || row.disabled}
                  onClick={() => {
                    if (row.disabled) return;
                    setSelectedSize(row.size);
                  }}
                  className={`min-w-[2.75rem] rounded-full border px-3 py-2 text-sm font-medium transition ${
                    row.disabled
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 line-through"
                      : isSel
                        ? "border-crown-800 bg-crown-800 text-white"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                  }`}
                >
                  {row.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showColorUi && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Color</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {colorRows.map((row) => {
              const isSel = selectedColor === row.color;
              return (
                <button
                  key={`${row.label}-${row.color}`}
                  type="button"
                  disabled={!uiReady || row.disabled}
                  onClick={() => {
                    if (row.disabled) return;
                    setSelectedColor(row.color);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    row.disabled
                      ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 line-through"
                      : isSel
                        ? "border-crown-800 bg-crown-800 text-white"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                  }`}
                >
                  {row.label}
                </button>
              );
            })}
          </div>
          {showOtherColorHint && (
            <p className="mt-2 text-sm text-crown-800">Size available in other colors</p>
          )}
        </div>
      )}

      {!singleDefault && (!selectedVariant || available <= 0) && (
        <p className="text-sm font-medium text-zinc-600">Select a size{colorDim ? " and color" : ""} to continue.</p>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Quantity</p>
        <div className="mt-2 inline-flex items-stretch rounded-full border border-zinc-300 bg-white">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={!uiReady || qty <= 1}
            onClick={() => bumpQty(-1)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-l-full text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-5 w-5" strokeWidth={2} />
          </button>
          <span className="flex min-w-[3rem] items-center justify-center border-x border-zinc-300 px-2 text-base font-semibold tabular-nums text-zinc-900">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={!uiReady || qty >= Math.max(1, remaining)}
            onClick={() => bumpQty(1)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-full text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          {available <= 0 ? "Out of stock" : `${remaining} left for this option`}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {inBag === 0 ? (
          <button
            type="button"
            onClick={pushItemsToCart}
            disabled={!canBuy || remaining <= 0}
            className="w-full min-w-[200px] flex-1 rounded-full bg-crown-800 py-3 text-sm font-semibold text-white transition hover:bg-crown-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {!uiReady ? "Loading…" : !canBuy || remaining <= 0 ? "Select options" : "Add to cart"}
          </button>
        ) : (
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-crown-800">In cart</span>
            <div className="inline-flex items-stretch rounded-full border border-zinc-300 bg-white">
              <button
                type="button"
                aria-label="Decrease quantity in bag"
                disabled={!uiReady || inBag <= 0}
                onClick={() => updateQuantity(lineKey, inBag - 1)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-l-full text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="h-5 w-5" strokeWidth={2} />
              </button>
              <span className="flex min-w-[3rem] items-center justify-center border-x border-zinc-300 px-2 text-base font-semibold tabular-nums text-zinc-900">
                {inBag}
              </span>
              <button
                type="button"
                aria-label="Increase quantity in bag"
                disabled={!uiReady || inBag >= available}
                onClick={() => updateQuantity(lineKey, inBag + 1)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-full text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!canBuy || remaining <= 0}
          onClick={() => goCheckout("UPI")}
          className="w-full min-w-[160px] flex-1 rounded-full border border-crown-800 py-3 text-sm font-semibold text-crown-900 transition hover:bg-crown-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
        >
          Buy now — UPI
        </button>
        {codOk && (
          <button
            type="button"
            disabled={!canBuy || remaining <= 0}
            onClick={() => goCheckout("CASH_ON_DELIVERY")}
            className="w-full min-w-[160px] flex-1 rounded-full border border-zinc-300 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
          >
            Buy now — COD
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Delivery & returns: Free shipping over Rs 5,000. Easy exchanges within 14 days.
      </p>

      {showSizeChart && product.sizeChartImageUrl && (
        <SizeChartModal
          open={sizeChartOpen}
          imageUrl={product.sizeChartImageUrl}
          productName={product.name}
          onClose={() => setSizeChartOpen(false)}
        />
      )}
    </div>
  );
}
