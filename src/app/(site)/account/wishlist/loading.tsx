import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";
import { ProductCardSkeleton } from "@/components/skeletons/ProductCardSkeleton";

export default function WishlistLoading() {
  return (
    <div>
      <div className="mc-shimmer h-8 w-40 rounded-lg" />
      <div className="mc-shimmer mt-2 h-4 w-64 max-w-full rounded-md" />
      <div className={`mt-8 ${PRODUCT_GRID_COMFORT}`}>
        {[1, 2, 3, 4].map((i) => (
          <ProductCardSkeleton key={i} layout="grid" />
        ))}
      </div>
    </div>
  );
}
