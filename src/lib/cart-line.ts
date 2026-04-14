/** Stable cart line identity: product + size + color (trimmed). */

export function normVariantPart(s: string | undefined | null) {
  return (s ?? "").trim();
}

export function makeLineKey(productId: string, size: string | undefined | null, color: string | undefined | null) {
  const s = normVariantPart(size);
  const c = normVariantPart(color);
  return `${productId}\u0001${s}\u0001${c}`;
}

export function parseLineKey(lineKey: string): { productId: string; size: string; color: string } {
  const parts = lineKey.split("\u0001");
  if (parts.length >= 3) {
    return { productId: parts[0]!, size: parts[1] ?? "", color: parts[2] ?? "" };
  }
  return { productId: lineKey, size: "", color: "" };
}
