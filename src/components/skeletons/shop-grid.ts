/** Default responsive grid when no `cols` query (matches historical shop layout). */
export const SHOP_PRODUCT_GRID_DEFAULT_CLASS =
  "grid w-full grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-7 xl:grid-cols-5 xl:gap-8";

/** @deprecated Use `SHOP_PRODUCT_GRID_DEFAULT_CLASS` or `getShopProductGridClass`. */
export const SHOP_PRODUCT_GRID_CLASS = SHOP_PRODUCT_GRID_DEFAULT_CLASS;

/**
 * Tailwind grid for shop product density. On small screens columns are capped so cards stay usable.
 */
export function getShopProductGridClass(cols: 2 | 3 | 4 | 5 | 6 | null): string {
  if (cols == null) return SHOP_PRODUCT_GRID_DEFAULT_CLASS;
  const gap = "gap-4 sm:gap-5 md:gap-6 lg:gap-7 xl:gap-8";
  switch (cols) {
    case 2:
      return `grid w-full grid-cols-2 ${gap}`;
    case 3:
      return `grid w-full grid-cols-2 sm:grid-cols-3 ${gap}`;
    case 4:
      return `grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${gap}`;
    case 5:
      return `grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${gap}`;
    case 6:
      return `grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${gap}`;
    default:
      return SHOP_PRODUCT_GRID_DEFAULT_CLASS;
  }
}
