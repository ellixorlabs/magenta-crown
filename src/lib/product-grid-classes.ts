/** Responsive product grids — uses full width on large monitors. */

export const PRODUCT_GRID_COMFORT =
  "grid auto-rows-fr grid-cols-2 items-stretch gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";

export const PRODUCT_GRID_COZY =
  "grid auto-rows-fr grid-cols-2 items-stretch gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5";

export const PRODUCT_GRID_WIDE =
  "grid auto-rows-fr grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8";

export type ProductGridDensity = "comfort" | "cozy" | "wide";

export function productGridClass(density: ProductGridDensity | string | undefined) {
  if (density === "cozy") return PRODUCT_GRID_COZY;
  if (density === "wide") return PRODUCT_GRID_WIDE;
  return PRODUCT_GRID_COMFORT;
}
