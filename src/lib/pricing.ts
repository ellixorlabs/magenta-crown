/**
 * Central place for sale / discount math so web, APIs, and future mobile stay aligned.
 */

export function effectiveSalePrice(mrp: number, discountedPrice: number | null | undefined): number {
  if (discountedPrice != null && discountedPrice > 0 && discountedPrice < mrp) {
    return discountedPrice;
  }
  return mrp;
}

/** 0–100 when there is a real discount vs MRP; otherwise null. */
export function discountPercentOffMrp(mrp: number, salePrice: number): number | null {
  if (mrp <= 0 || salePrice >= mrp) return null;
  return Math.round((1 - salePrice / mrp) * 100);
}
