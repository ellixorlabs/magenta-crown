import type { ProductVariant } from "@prisma/client";
import { makeLineKey } from "@/lib/cart-line";
import {
  availableQty,
  findVariant,
  getProductTotalStock,
  isSingleDefaultVariant,
  type VariantForUi
} from "@/lib/product-variants";

export { getProductTotalStock } from "@/lib/product-variants";

export function isSingleDefaultSku(variants: Pick<ProductVariant, "color" | "size">[]): boolean {
  return isSingleDefaultVariant(variants as VariantForUi[]);
}

export function getVariantAvailable(
  variants: Pick<ProductVariant, "color" | "size" | "stock" | "isActive">[],
  size: string,
  color: string
): number {
  if (variants.length === 1 && isSingleDefaultVariant(variants as VariantForUi[])) {
    return availableQty(variants[0] as VariantForUi);
  }
  const v = findVariant(variants as VariantForUi[], color, size);
  return availableQty(v);
}

export function lineInBagQuantity(
  items: { lineKey: string; quantity: number }[],
  productId: string,
  size: string,
  color: string
): number {
  const key = makeLineKey(productId, size, color);
  return items.find((i) => i.lineKey === key)?.quantity ?? 0;
}
