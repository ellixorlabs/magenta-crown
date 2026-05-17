/** Responsive product grids — uses full width on large monitors. */

export const PRODUCT_GRID_COMFORT =
  "grid auto-rows-fr grid-cols-2 items-stretch gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-4 lg:grid-cols-5 lg:gap-4 xl:grid-cols-6 xl:gap-[1.05rem] 2xl:grid-cols-7 2xl:gap-4";

/** Tighter homepage-only grid: 2–6 columns, reduced gutters. */
export const PRODUCT_GRID_HOME_LUXURY =
  "grid grid-cols-2 items-start gap-2 sm:auto-rows-fr sm:items-stretch sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 md:gap-2.5 lg:grid-cols-5 lg:gap-3 xl:grid-cols-6 xl:gap-3";

export const PRODUCT_GRID_COZY =
  "grid auto-rows-fr grid-cols-2 items-stretch gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5 xl:gap-[1.05rem] 2xl:grid-cols-5 2xl:gap-4";

export const PRODUCT_GRID_WIDE =
  "grid auto-rows-fr grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 md:gap-3.5 lg:grid-cols-6 lg:gap-3.5 xl:grid-cols-7 xl:gap-4 2xl:grid-cols-8 2xl:gap-4";

/** Account wishlist: explicit row/column gaps so PWA cards do not visually stack. */
export const PRODUCT_GRID_WISHLIST =
  "grid grid-cols-2 items-start gap-x-2.5 gap-y-4 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 md:grid-cols-4 md:gap-y-6 lg:grid-cols-5 lg:gap-x-4 lg:gap-y-6";

export type ProductGridDensity = "comfort" | "cozy" | "wide";

export function productGridClass(density: ProductGridDensity | string | undefined) {
  if (density === "cozy") return PRODUCT_GRID_COZY;
  if (density === "wide") return PRODUCT_GRID_WIDE;
  return PRODUCT_GRID_COMFORT;
}
