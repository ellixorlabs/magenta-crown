/** Shared shape for shop/search product cards (keep in sync with DB mapping in `shop-products-db`). */
export type ShopProductGridRow = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  category: string;
  mrp: number;
  discountedPrice: number | null;
  imageUrls: string[];
  listImageIndex: number;
  listImagePosition: string;
  createdAt: string | Date;
  tags: string[];
  newTagExpiresAt: string | Date | null;
  material: string | null;
  occasion: string | null;
  style: string | null;
  variants: { stock: number; isActive: boolean; color?: string | null; size?: string | null }[];
  reviews: { rating: number }[];
};
