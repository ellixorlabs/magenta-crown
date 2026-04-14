import type { ProductVariant } from "@prisma/client";
import { makeLineKey, normVariantPart } from "@/lib/cart-line";

/** One inventory row with blank size+color — stock applies to the whole product (any PDP selection). */
export function isSingleDefaultSku(
  variants: Pick<ProductVariant, "size" | "color">[]
): boolean {
  return (
    variants.length === 1 &&
    normVariantPart(variants[0]!.size) === "" &&
    normVariantPart(variants[0]!.color) === ""
  );
}

/** Total units for listing filters / badges: sum of variant rows, or aggregate when no rows. */
export function getProductTotalStock(
  variants: Pick<ProductVariant, "quantity">[],
  fallbackStock: number
): number {
  if (variants.length === 0) return Math.max(0, fallbackStock);
  const sum = variants.reduce((a, v) => a + Math.max(0, v.quantity), 0);
  if (sum > 0) return sum;
  return Math.max(0, fallbackStock);
}

export function getVariantAvailable(
  variants: Pick<ProductVariant, "size" | "color" | "quantity">[],
  fallbackStock: number,
  size: string,
  color: string
): number {
  if (variants.length === 0) {
    return Math.max(0, fallbackStock);
  }
  if (isSingleDefaultSku(variants)) {
    return Math.max(0, variants[0]!.quantity);
  }
  const ns = normVariantPart(size);
  const nc = normVariantPart(color);
  const v = variants.find((x) => normVariantPart(x.size) === ns && normVariantPart(x.color) === nc);
  return Math.max(0, v?.quantity ?? 0);
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
