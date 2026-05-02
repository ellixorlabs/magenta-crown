import { Skeleton } from "@/components/ui/skeleton";

export function OrdersPageSkeleton() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-9 w-40 sm:w-48" rounded="lg" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" rounded="md" />
        </div>
        <Skeleton className="h-4 w-36" rounded="md" />
      </div>
      <div className="mt-6 flex gap-2 overflow-x-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-[7.5rem] shrink-0" rounded="full" />
        ))}
      </div>
      <ul className="mt-6 space-y-4">
        {[1, 2].map((i) => (
          <li key={i} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-wrap justify-between gap-3 border-b border-zinc-100 px-4 py-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" rounded="md" />
                <Skeleton className="h-3 w-28" rounded="md" />
              </div>
              <Skeleton className="h-7 w-24" rounded="full" />
            </div>
            <div className="flex gap-4 px-4 py-4">
              <Skeleton className="h-[72px] w-[72px] shrink-0" rounded="xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" rounded="md" />
                <Skeleton className="h-3 w-20" rounded="md" />
                <Skeleton className="h-5 w-24" rounded="md" />
              </div>
            </div>
            <div className="flex gap-3 border-t border-zinc-100 px-4 py-4">
              <Skeleton className="h-11 flex-1" rounded="xl" />
              <Skeleton className="h-4 w-16" rounded="md" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
