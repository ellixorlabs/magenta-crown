/** Responsive product grids — uses full width on large monitors. */

export const PRODUCT_GRID_COMFORT =
  "grid auto-rows-fr grid-cols-2 items-stretch gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-4 lg:grid-cols-5 lg:gap-4 xl:grid-cols-6 xl:gap-[1.05rem] 2xl:grid-cols-7 2xl:gap-4";

export const PRODUCT_GRID_COZY =
  "grid auto-rows-fr grid-cols-2 items-stretch gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5 xl:gap-[1.05rem] 2xl:grid-cols-5 2xl:gap-4";

export const PRODUCT_GRID_WIDE =
  "grid auto-rows-fr grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 md:gap-3.5 lg:grid-cols-6 lg:gap-3.5 xl:grid-cols-7 xl:gap-4 2xl:grid-cols-8 2xl:gap-4";

export type ProductGridDensity = "comfort" | "cozy" | "wide";

export function productGridClass(density: ProductGridDensity | string | undefined) {
  if (density === "cozy") return PRODUCT_GRID_COZY;
  if (density === "wide") return PRODUCT_GRID_WIDE;
  return PRODUCT_GRID_COMFORT;
}
