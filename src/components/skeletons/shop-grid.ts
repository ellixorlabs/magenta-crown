/** Default responsive storefront grid — column count and gaps scale with viewport (no manual view toggle). */
export const SHOP_PRODUCT_GRID_DEFAULT_CLASS =
  "grid w-full grid-cols-2 items-start gap-2.5 sm:auto-rows-fr sm:items-stretch sm:gap-5 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8 xl:grid-cols-4 xl:gap-9 2xl:grid-cols-5 2xl:gap-10";

/** @deprecated Use `SHOP_PRODUCT_GRID_DEFAULT_CLASS` or `getShopProductGridClass`. */
export const SHOP_PRODUCT_GRID_CLASS = SHOP_PRODUCT_GRID_DEFAULT_CLASS;

/**
 * Tailwind grid for shop product density. On small screens columns are capped so cards stay usable.
 */
export function getShopProductGridClass(cols: 2 | 3 | 4 | 5 | 6 | null): string {
  if (cols == null) return SHOP_PRODUCT_GRID_DEFAULT_CLASS;
  const base = "grid w-full auto-rows-fr items-stretch";
  const gap = "gap-5 sm:gap-6 md:gap-7 lg:gap-8 xl:gap-9 2xl:gap-10";
  switch (cols) {
    case 2:
      return `${base} grid-cols-2 ${gap}`;
    case 3:
      return `${base} grid-cols-2 sm:grid-cols-3 ${gap}`;
    case 4:
      return `${base} grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${gap}`;
    case 5:
      return `${base} grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${gap}`;
    case 6:
      return `${base} grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 ${gap}`;
    default:
      return SHOP_PRODUCT_GRID_DEFAULT_CLASS;
  }
}
