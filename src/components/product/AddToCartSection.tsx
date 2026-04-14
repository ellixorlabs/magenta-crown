"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Product, ProductVariant } from "@prisma/client";
import { getProductDisplayImage } from "@/lib/product-image-display";
import { useCart } from "@/context/CartContext";
import { getVariantAvailable, isSingleDefaultSku, lineInBagQuantity } from "@/lib/variant-stock";

type Props = {
  product: Product & { variants: ProductVariant[] };
};

export function AddToCartSection({ product }: Props) {
  const { data: session } = useSession();
  const { addItem, items } = useCart();
  const isStaff =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUB_ADMIN" ||
    session?.user?.role === "TECH_SUPPORT";
  const price = product.discountedPrice ?? product.mrp;
  const singleDefault = useMemo(() => isSingleDefaultSku(product.variants), [product.variants]);
  const [size, setSize] = useState(
    () => (isSingleDefaultSku(product.variants) ? "" : product.sizes[0] ?? "")
  );
  const [color, setColor] = useState(
    () => (isSingleDefaultSku(product.variants) ? "" : product.colors[0] ?? "")
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const { url: img } = getProductDisplayImage(product);

  const lineSize = singleDefault ? "" : size;
  const lineColor = singleDefault ? "" : color;

  const available = useMemo(
    () => getVariantAvailable(product.variants, product.stockQuantity, lineSize, lineColor),
    [product.variants, product.stockQuantity, lineSize, lineColor]
  );

  const inBag = lineInBagQuantity(items, product.id, lineSize, lineColor);
  const maxAdd = Math.max(0, available - inBag);
  const maxQtyInput = available <= 0 ? 0 : Math.max(1, available);

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

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-semibold text-crown-800">Rs {price}</span>
        {product.discountedPrice && (
          <span className="text-lg text-zinc-400 line-through">Rs {product.mrp}</span>
        )}
      </div>

      {!singleDefault && product.sizes.length > 0 && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Size</label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={size}
            onChange={(e) => {
              setSize(e.target.value);
              setQty(1);
            }}
          >
            {product.sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {!singleDefault && product.colors.length > 0 && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Color</label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setQty(1);
            }}
          >
            {product.colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Qty</label>
        <input
          type="number"
          min={available <= 0 ? 0 : 1}
          max={maxQtyInput || undefined}
          disabled={available <= 0}
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
          disabled={available <= 0 || maxAdd <= 0}
          onClick={() => {
            const toAdd = Math.min(qty, maxAdd);
            if (toAdd <= 0) return;
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price,
              quantity: toAdd,
              imageUrl: img,
              size: lineSize || undefined,
              color: lineColor || undefined,
              maxStock: available
            });
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
          className="min-w-[200px] flex-1 rounded-full bg-crown-800 py-3 text-sm font-semibold text-white transition hover:bg-crown-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {available <= 0 ? "Out of stock" : maxAdd <= 0 ? "Max in bag" : added ? "Added to bag" : "Add to cart"}
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
