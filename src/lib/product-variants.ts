import type { ProductVariant } from "@prisma/client";

/** Placeholder SKUs for simple / legacy single-SKU products. */
export const DEFAULT_COLOR = "Default";
export const DEFAULT_SIZE = "One size";

export type VariantForUi = Pick<ProductVariant, "id" | "color" | "size" | "stock" | "isActive">;

/** Minimal shape for aggregating catalog stock (e.g. partial Prisma selects). */
export type VariantStockSlice = Pick<ProductVariant, "stock" | "isActive">;

export function normPart(s: string | null | undefined) {
  return (s ?? "").trim();
}

/** Total sellable units (active rows only). */
export function getProductTotalStock(variants: VariantStockSlice[]): number {
  return variants.filter((v) => v.isActive).reduce((a, v) => a + Math.max(0, v.stock), 0);
}

/** Colors that have at least one active variant with stock > 0 (for PDP color chips). */
export function sellableColors(variants: VariantForUi[]): string[] {
  const s = new Set<string>();
  for (const v of variants) {
    if (!v.isActive || v.stock <= 0) continue;
    const c = normPart(v.color);
    if (c) s.add(c);
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

export function sizesForColor(
  color: string,
  variants: VariantForUi[]
): { size: string; stock: number; disabled: boolean }[] {
  const nc = normPart(color);
  const bySize = new Map<string, number>();
  for (const v of variants) {
    if (normPart(v.color) !== nc) continue;
    if (!v.isActive) continue;
    const sz = normPart(v.size);
    if (!sz) continue;
    bySize.set(sz, Math.max(0, v.stock));
  }
  const rows = [...bySize.entries()].map(([size, stock]) => ({
    size,
    stock,
    disabled: stock <= 0
  }));
  rows.sort((a, b) => a.size.localeCompare(b.size));
  return rows;
}

export function findVariant(
  variants: VariantForUi[],
  color: string,
  size: string
): VariantForUi | undefined {
  const nc = normPart(color);
  const ns = normPart(size);
  return variants.find((v) => normPart(v.color) === nc && normPart(v.size) === ns && v.isActive);
}

export function availableQty(v: VariantForUi | undefined): number {
  if (!v || !v.isActive) return 0;
  return Math.max(0, v.stock);
}

/** True if `size` is out for `color` but in stock under another color. */
export function sizeAvailableInOtherColors(color: string, size: string, variants: VariantForUi[]): boolean {
  const ns = normPart(size);
  const nc = normPart(color);
  if (!ns) return false;
  for (const v of variants) {
    if (!v.isActive || v.stock <= 0) continue;
    if (normPart(v.color) === nc) continue;
    if (normPart(v.size) === ns) return true;
  }
  return false;
}

/**
 * Single default row (Default / One size or empty) — show PDP without pickers.
 */
export function isSingleDefaultVariant(variants: VariantForUi[]): boolean {
  if (variants.length !== 1) return false;
  const v = variants[0]!;
  const c = normPart(v.color);
  const s = normPart(v.size);
  return (
    (c === "" || c === DEFAULT_COLOR) &&
    (s === "" || s === DEFAULT_SIZE)
  );
}
