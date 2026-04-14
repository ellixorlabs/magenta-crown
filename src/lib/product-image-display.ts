import type { Product } from "@prisma/client";

const FALLBACK =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80";

export function getProductDisplayImage(product: Pick<Product, "imageUrls" | "listImageIndex">): {
  url: string;
  index: number;
} {
  const urls = product.imageUrls ?? [];
  if (urls.length === 0) return { url: FALLBACK, index: 0 };
  const idx = Math.max(0, Math.min(urls.length - 1, product.listImageIndex ?? 0));
  return { url: urls[idx] ?? FALLBACK, index: idx };
}

export function getListImagePosition(product: Pick<Product, "listImagePosition">): string {
  const p = product.listImagePosition?.trim();
  return p && p.length > 0 ? p : "center";
}
