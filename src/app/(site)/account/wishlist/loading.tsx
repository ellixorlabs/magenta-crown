import { ProductCardSkeleton } from "@/components/skeletons/ProductCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";

export default function WishlistLoading() {
  return (
    <div className="py-10">
      <Skeleton className="h-8 w-40 max-w-full" rounded="lg" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" rounded="md" />
      <div className={`mt-8 ${PRODUCT_GRID_COMFORT}`}>
        {[1, 2, 3, 4].map((i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
