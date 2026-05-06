export const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "SOLD_OUT", "ARCHIVED"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export function normalizeProductStatus(input: unknown): ProductStatus {
  const raw = String(input ?? "").trim().toUpperCase();
  if (raw === "DRAFT" || raw === "SOLD_OUT" || raw === "ARCHIVED") return raw;
  return "ACTIVE";
}

export function isStorefrontVisibleStatus(status: unknown): boolean {
  return normalizeProductStatus(status) === "ACTIVE";
}

