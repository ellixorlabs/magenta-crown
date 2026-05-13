export type ShopProductReviewSummary = { avg: number; count: number };

export function summarizeShopProductReviews(reviews: { rating: number }[]): ShopProductReviewSummary | null {
  if (!reviews.length) return null;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { avg: sum / reviews.length, count: reviews.length };
}

/** Plain object for passing across the RSC → client boundary (no functions). */
export function reviewSummaryMapFromProducts(
  products: { id: string; reviews: { rating: number }[] }[]
): Record<string, ShopProductReviewSummary | null> {
  return Object.fromEntries(products.map((p) => [p.id, summarizeShopProductReviews(p.reviews ?? [])]));
}
