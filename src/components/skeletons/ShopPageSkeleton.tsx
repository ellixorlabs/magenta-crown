import { ProductCardSkeleton } from "@/components/skeletons/ProductCardSkeleton";
import { SHOP_PRODUCT_GRID_CLASS } from "@/components/skeletons/shop-grid";
import { Skeleton } from "@/components/ui/skeleton";

export function ShopPageSkeleton() {
  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden text-zinc-900">
      <div className="border-b border-zinc-200/60 bg-white/40 py-8 backdrop-blur-sm">
        <div className="section-shell text-center">
          <Skeleton className="mx-auto h-3 w-16" rounded="md" />
          <Skeleton className="mx-auto mt-3 h-9 w-48 max-w-full sm:h-10" rounded="lg" />
          <Skeleton className="mx-auto mt-3 h-4 w-full max-w-2xl" rounded="md" />
        </div>
      </div>

      <div className="section-shell py-8 sm:py-10">
        <div className="flex min-w-0 flex-col items-stretch gap-10 lg:flex-row lg:items-start lg:gap-12 xl:gap-14">
          <aside className="hidden w-full max-w-[300px] shrink-0 lg:block lg:min-w-[260px]">
            <div className="rounded-2xl border border-zinc-200/90 bg-white/95 p-5 shadow-sm">
              <div className="space-y-4">
                <Skeleton className="h-5 w-24" rounded="md" />
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" rounded="lg" />
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 w-full flex-1">
            <div className="mb-4 flex justify-center">
              <Skeleton className="h-9 w-36 rounded-full" />
            </div>

            <div className={SHOP_PRODUCT_GRID_CLASS}>
              {Array.from({ length: 10 }).map((_, i) => (
                <ProductCardSkeleton key={i} layout="grid" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
