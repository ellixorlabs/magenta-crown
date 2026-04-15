"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Product, ProductVariant } from "@prisma/client";
import { getProductDisplayImage } from "@/lib/product-image-display";
import { useCart } from "@/context/CartContext";
import { getVariantAvailable, isSingleDefaultSku, lineInBagQuantity } from "@/lib/variant-stock";
import {
  findVariant,
  getProductTotalStock,
  normPart,
  sellableColors,
  sizeAvailableInOtherColors,
  sizesForColor,
  type VariantForUi
} from "@/lib/product-variants";

type Props = {
  product: Product & { variants: ProductVariant[] };
};

export function AddToCartSection({ product }: Props) {
  const variants = product.variants as VariantForUi[];
  const [uiReady, setUiReady] = useState(false);
  const { data: session } = useSession();
  const { addItem, items } = useCart();

  useEffect(() => {
    setUiReady(true);
  }, []);
  const isStaff =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUB_ADMIN" ||
    session?.user?.role === "TECH_SUPPORT";
  const price = product.discountedPrice ?? product.mrp;
  const singleDefault = useMemo(() => isSingleDefaultSku(product.variants), [product.variants]);
  const colors = useMemo(() => sellableColors(variants), [variants]);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    if (singleDefault) return;
    if (colors.length === 0) return;
    setSelectedColor((c) => (c && colors.includes(c) ? c : colors[0]!));
  }, [colors, singleDefault]);

  const sizeRows = useMemo(
    () => (selectedColor ? sizesForColor(selectedColor, variants) : []),
    [selectedColor, variants]
  );

  useEffect(() => {
    if (singleDefault) return;
    if (sizeRows.length === 0) {
      setSelectedSize("");
      return;
    }
    setSelectedSize((s) => {
      if (s && sizeRows.some((r) => r.size === s)) return s;
      return sizeRows[0]!.size;
    });
  }, [sizeRows, singleDefault]);

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const { url: img } = getProductDisplayImage(product);

  const v0 = product.variants[0];
  const lineSize = singleDefault ? normPart(v0?.size) : selectedSize;
  const lineColor = singleDefault ? normPart(v0?.color) : selectedColor;

  const available = useMemo(() => {
    if (singleDefault) {
      return getVariantAvailable(product.variants, "", "");
    }
    return getVariantAvailable(product.variants, selectedSize, selectedColor);
  }, [product.variants, singleDefault, selectedSize, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (singleDefault) return product.variants[0];
    return findVariant(variants, selectedColor, selectedSize);
  }, [singleDefault, product.variants, variants, selectedColor, selectedSize]);

  const inBag = lineInBagQuantity(items, product.id, lineSize, lineColor);
  const maxAdd = Math.max(0, available - inBag);
  const maxQtyInput = available <= 0 ? 0 : Math.max(1, available);

  const showColorUi = !singleDefault && colors.length > 1;
  const showSizeUi = !singleDefault && colors.length > 0 && Boolean(selectedColor);

  const currentSizeRow = sizeRows.find((r) => r.size === selectedSize);
  const showOtherColorHint =
    Boolean(selectedColor && selectedSize) &&
    Boolean(currentSizeRow?.disabled) &&
    sizeAvailableInOtherColors(selectedColor, selectedSize, variants);

  const totalSellable = getProductTotalStock(variants);

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
          {product.discountedPrice && (
            <span className="text-lg text-zinc-400 line-through">Rs {product.mrp}</span>
          )}
        </div>
        <p className="text-sm font-medium text-zinc-600">This item is currently out of stock.</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6"
      aria-busy={!uiReady}
      data-add-to-cart-ready={uiReady ? "true" : "false"}
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-semibold text-crown-800">Rs {price}</span>
        {product.discountedPrice && (
          <span className="text-lg text-zinc-400 line-through">Rs {product.mrp}</span>
        )}
      </div>

      {showColorUi && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Color</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                disabled={!uiReady}
                onClick={() => {
                  setSelectedColor(c);
                  setQty(1);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selectedColor === c
                    ? "border-crown-800 bg-crown-800 text-white"
                    : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSizeUi && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Size</label>
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
                    setQty(1);
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
          {showOtherColorHint && (
            <p className="mt-2 text-sm text-crown-800">
              Size {selectedSize} is available in other colors.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Qty</label>
        <input
          type="number"
          min={available <= 0 ? 0 : 1}
          max={maxQtyInput || undefined}
          disabled={!uiReady || available <= 0}
          className="w-20 rounded-lg border border-zinc-300 px-2 py-2 text-sm disabled:opacity-50"
          value={available <= 0 ? 0 : qty}
          onChange={(e) => {
            const n = Math.max(1, Number(e.target.value));
            setQty(Math.min(n, maxQtyInput));
          }}
        />
        <span className="text-sm text-zinc-500">{available} available for this option</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={
            !uiReady || available <= 0 || maxAdd <= 0 || (!singleDefault && !selectedVariant)
          }
          onClick={() => {
            const toAdd = Math.min(qty, maxAdd);
            if (toAdd <= 0) return;
            if (!singleDefault && !selectedVariant) return;
            const vid = singleDefault ? v0?.id : selectedVariant?.id;
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price,
              quantity: toAdd,
              imageUrl: img,
              size: lineSize || undefined,
              color: lineColor || undefined,
              variantId: vid,
              maxStock: available
            });
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
          className="min-w-[200px] flex-1 rounded-full bg-crown-800 py-3 text-sm font-semibold text-white transition hover:bg-crown-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!uiReady
            ? "Loading…"
            : available <= 0
              ? "Out of stock"
              : maxAdd <= 0
                ? "Max in bag"
                : added
                  ? "Added to bag"
                  : "Add to cart"}
        </button>
        {inBag > 0 && (
          <span className="text-sm font-medium text-zinc-600 tabular-nums">In bag: {inBag}</span>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Delivery & returns: Free shipping over Rs 5,000. Easy exchanges within 14 days.
      </p>
    </div>
  );
}
