import { Skeleton } from "@/components/ui/skeleton";

export function OrdersPageSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-40" rounded="lg" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" rounded="md" />
      <ul className="mt-8 space-y-6">
        {[1, 2].map((i) => (
          <li key={i} className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" rounded="md" />
                <Skeleton className="h-3 w-36" rounded="md" />
              </div>
              <Skeleton className="h-6 w-24" rounded="md" />
            </div>
            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
              <Skeleton className="h-4 w-full" rounded="md" />
              <Skeleton className="h-4 w-4/5" rounded="md" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
