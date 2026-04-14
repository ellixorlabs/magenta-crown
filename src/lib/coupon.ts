/** Coupon codes in DB and API: letters and digits only, uppercase, no spaces or symbols. */

export function normalizeCouponCode(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function isValidCouponCodeFormat(normalized: string): boolean {
  return normalized.length >= 2 && normalized.length <= 32;
}
