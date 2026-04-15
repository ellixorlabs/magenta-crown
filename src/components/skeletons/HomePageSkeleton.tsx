import { Skeleton } from "@/components/ui/skeleton";

export function HomePageSkeleton() {
  return (
    <div className="w-full space-y-8 py-8">
      <Skeleton className="mx-auto min-h-[40vh] w-full max-w-[1920px] rounded-2xl sm:min-h-[50vh]" rounded="xl" />
      <div className="section-shell grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full" rounded="xl" />
        ))}
      </div>
    </div>
  );
}
