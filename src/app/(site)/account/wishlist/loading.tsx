import { ProductCardSkeleton } from "@/components/skeletons/ProductCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PRODUCT_GRID_WISHLIST } from "@/lib/product-grid-classes";

export default function WishlistLoading() {
  return (
    <div className="space-y-6 pb-2">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 max-w-full" rounded="lg" />
        <Skeleton className="h-4 w-72 max-w-full" rounded="md" />
      </div>
      <div className={PRODUCT_GRID_WISHLIST}>
        {[1, 2, 3, 4].map((i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
