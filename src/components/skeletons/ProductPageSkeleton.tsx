import { Skeleton } from "@/components/ui/skeleton";

export function ProductPageSkeleton() {
  return (
    <main className="bg-[#f8f5f6]">
      <div className="section-shell py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Skeleton className="aspect-[3/4] w-full rounded-3xl border border-zinc-200/80 shadow-sm" />
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-3 w-28" rounded="md" />
            <Skeleton className="h-10 w-full max-w-xl" rounded="lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" rounded="md" />
              <Skeleton className="h-4 w-full" rounded="md" />
              <Skeleton className="h-4 w-3/4" rounded="md" />
            </div>
            <Skeleton className="h-32 w-full rounded-2xl border border-zinc-200/80" />
          </div>
        </div>
      </div>
    </main>
  );
}
