import type { ProductRow } from "@/lib/db/app-types";

const FALLBACK = "/branding/mc-loader-logo.png";

export function getProductDisplayImage(product: Pick<ProductRow, "imageUrls" | "listImageIndex">): {
  url: string;
  index: number;
} {
  const urls = product.imageUrls ?? [];
  if (urls.length === 0) return { url: FALLBACK, index: 0 };
  const idx = Math.max(0, Math.min(urls.length - 1, product.listImageIndex ?? 0));
  return { url: urls[idx] ?? FALLBACK, index: idx };
}

export function getListImagePosition(product: Pick<ProductRow, "listImagePosition">): string {
  const p = product.listImagePosition?.trim();
  return p && p.length > 0 ? p : "center";
}
