import type { ProductVariant } from "@prisma/client";

/** Legacy placeholder in DB; treated as “no color” in UI. */
export const DEFAULT_COLOR = "Default";
export const DEFAULT_SIZE = "One size";

export type VariantForUi = Pick<ProductVariant, "id" | "color" | "size" | "stock" | "isActive">;

/** Minimal shape for aggregating catalog stock (e.g. partial Prisma selects). */
export type VariantStockSlice = Pick<ProductVariant, "stock" | "isActive">;

export function normPart(s: string | null | undefined) {
  return (s ?? "").trim();
}

/** Normalize color for matching: blank or legacy Default → empty key. */
export function normColorKey(s: string | null | undefined) {
  const t = normPart(s);
  if (!t || t === DEFAULT_COLOR) return "";
  return t;
}

/** Value to store in cart / lineKey for “no color” variants (matches `normColorKey`). */
export function cartColorFromVariant(v: Pick<ProductVariant, "color"> | undefined) {
  if (!v) return "";
  return normColorKey(v.color) === "" ? "" : normPart(v.color);
}

/** Total sellable units (active rows only). */
export function getProductTotalStock(variants: VariantStockSlice[]): number {
  return variants.filter((v) => v.isActive).reduce((a, v) => a + Math.max(0, v.stock), 0);
}

export function findVariant(
  variants: VariantForUi[],
  color: string,
  size: string
): VariantForUi | undefined {
  const nc = normColorKey(color);
  const ns = normPart(size);
  return variants.find((v) => normColorKey(v.color) === nc && normPart(v.size) === ns && v.isActive);
}

export function availableQty(v: VariantForUi | undefined): number {
  if (!v || !v.isActive) return 0;
  return Math.max(0, v.stock);
}

/** Product has a real color dimension (not only blank/Default). */
export function hasColorDimension(variants: VariantForUi[]): boolean {
  return variants.some((v) => normColorKey(v.color) !== "");
}

/** Distinct sizes (as stored), each with total stock across colors (active only). */
export function sizesWithTotals(variants: VariantForUi[]): { size: string; totalStock: number }[] {
  const m = new Map<string, number>();
  for (const v of variants) {
    if (!v.isActive) continue;
    const sz = normPart(v.size);
    if (!sz) continue;
    m.set(sz, (m.get(sz) ?? 0) + Math.max(0, v.stock));
  }
  return [...m.entries()]
    .map(([size, totalStock]) => ({ size, totalStock }))
    .sort((a, b) => a.size.localeCompare(b.size));
}

/** Size row for PDP: disabled when no sellable stock in any color. */
export function sizeRowsForPdp(variants: VariantForUi[]): { size: string; disabled: boolean }[] {
  return sizesWithTotals(variants).map(({ size, totalStock }) => ({
    size,
    disabled: totalStock <= 0
  }));
}

/**
 * Colors available for a size (active rows). `color` is storage value (may be "");
 * `label` is what we show ("Standard" when blank).
 */
export function colorsForSize(
  size: string,
  variants: VariantForUi[]
): { color: string; label: string; stock: number; disabled: boolean }[] {
  const ns = normPart(size);
  const byKey = new Map<string, { color: string; label: string; stock: number }>();
  for (const v of variants) {
    if (normPart(v.size) !== ns) continue;
    if (!v.isActive) continue;
    const ck = normColorKey(v.color);
    const raw = normPart(v.color);
    const label = ck === "" ? "Standard" : raw;
    const key = ck === "" ? "__NONE__" : raw.toLowerCase();
    const prev = byKey.get(key);
    const add = Math.max(0, v.stock);
    if (!prev) {
      byKey.set(key, { color: raw, label, stock: add });
    } else {
      byKey.set(key, { ...prev, stock: prev.stock + add });
    }
  }
  const rows = [...byKey.values()].map(({ color, label, stock }) => ({
    color,
    label,
    stock,
    disabled: stock <= 0
  }));
  rows.sort((a, b) => a.label.localeCompare(b.label));
  return rows;
}

/** Legacy / simple catalog: exactly one variant and both dimensions are placeholders. */
export function isSingleDefaultVariant(variants: VariantForUi[]): boolean {
  if (variants.length !== 1) return false;
  const v = variants[0]!;
  const c = normColorKey(v.color);
  const s = normPart(v.size);
  return (c === "" || c === DEFAULT_COLOR) && (s === "" || s === DEFAULT_SIZE);
}

/** True if this size has no stock in `color` but has stock in another color. */
export function sizeAvailableInOtherColors(color: string, size: string, variants: VariantForUi[]): boolean {
  const ns = normPart(size);
  const nc = normColorKey(color);
  if (!ns) return false;
  const vSel = findVariant(variants, color, size);
  if (vSel && availableQty(vSel) > 0) return false;
  for (const v of variants) {
    if (!v.isActive || v.stock <= 0) continue;
    if (normPart(v.size) !== ns) continue;
    if (normColorKey(v.color) === nc) continue;
    return true;
  }
  return false;
}
