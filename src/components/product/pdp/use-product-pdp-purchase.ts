"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { makeLineKey } from "@/lib/cart-line";
import type { CouponRow, ProductRow, ProductVariantRow } from "@/lib/db/app-types";
import { getProductDisplayImage } from "@/lib/product-image-display";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { isStaffRole } from "@/lib/admin-permissions";
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

export type ProductPdp = ProductRow & {
  variants: ProductVariantRow[];
  featuredCoupons?: Array<{ coupon: Pick<CouponRow, "code" | "discountPct" | "isActive"> }>;
  sizeChartImageUrl?: string | null;
  /** Mirrors Product.showSizeChart; omitted = visible when chart URL exists. */
  showSizeChart?: boolean;
  globalSizeChartImageUrl?: string | null;
  codEnabled?: boolean;
  prepaidOfferText?: string | null;
  pricingFootnote?: string | null;
};

export function pctOff(mrp: number, sale: number | null | undefined) {
  if (sale == null || sale >= mrp || mrp <= 0) return null;
  return Math.round(((mrp - sale) / mrp) * 100);
}

export function useProductPdpPurchase(
  product: ProductPdp,
  _reviewAvg: number | null,
  _reviewCount: number
) {
  const router = useRouter();
  const variants = product.variants as VariantForUi[];
  const { role } = useAuth();
  const { addItem, items, updateQuantity, clearCart } = useCart();

  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const isStaff = isStaffRole(role);

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

  const lineKey = useMemo(() => makeLineKey(product.id, lineSize, lineColor), [product.id, lineSize, lineColor]);

  const { url: img } = getProductDisplayImage(product);

  const showSizeUi = !singleDefault && sizeRows.length > 0;
  const showColorUi = !singleDefault && colorDim && selectedSize && colorRows.length > 0;
  const effectiveSizeChartUrl = product.sizeChartImageUrl?.trim() || product.globalSizeChartImageUrl?.trim() || "";
  const sizeChartAllowed = product.showSizeChart !== false;
  const showSizeChart = sizeChartAllowed && Boolean(effectiveSizeChartUrl);

  const currentColorRow = colorRows.find((r) => r.color === selectedColor);
  const showOtherColorHint =
    colorDim &&
    Boolean(selectedSize && selectedColor) &&
    Boolean(currentColorRow?.disabled) &&
    sizeAvailableInOtherColors(selectedColor, selectedSize, variants);

  const totalSellable = getProductTotalStock(variants);
  const offPct = pctOff(product.mrp, product.discountedPrice);

  const offers = useMemo(
    () => (product.featuredCoupons ?? []).map((x) => x.coupon).filter((c) => c.isActive),
    [product.featuredCoupons]
  );

  const canBuy = singleDefault || (Boolean(selectedVariant) && available > 0);

  const pushItemsToCart = useCallback(() => {
    if (!selectedVariant && !singleDefault) return;
    const vid = singleDefault ? product.variants[0]?.id : selectedVariant?.id;
    if (!vid) return;
    if (remaining <= 0) return;
    const q = Math.min(1, remaining);
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
    remaining,
    selectedVariant,
    singleDefault,
    product.variants
  ]);

  const goBuyNow = useCallback(() => {
    if (!selectedVariant && !singleDefault) return;
    const vid = singleDefault ? product.variants[0]?.id : selectedVariant?.id;
    if (!vid) return;
    if (remaining <= 0) return;
    const q = Math.min(inBag > 0 ? inBag : 1, Math.max(1, remaining));
    clearCart();
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
    router.push("/checkout");
  }, [
    addItem,
    clearCart,
    img,
    inBag,
    lineColor,
    lineSize,
    price,
    product.id,
    product.name,
    product.slug,
    remaining,
    router,
    selectedVariant,
    singleDefault,
    product.variants,
    available
  ]);

  const pricingNote =
    product.pricingFootnote?.trim() || "Inclusive of all taxes. Shipping is calculated at checkout.";

  return {
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
  };
}

export type ProductPdpPurchaseState = ReturnType<typeof useProductPdpPurchase>;
