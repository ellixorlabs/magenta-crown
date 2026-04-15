import { Skeleton } from "@/components/ui/skeleton";

type Props = { layout?: "grid" | "list" };

export function ProductCardSkeleton({ layout = "grid" }: Props) {
  if (layout === "list") {
    return (
      <div className="flex gap-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-0">
        <Skeleton className="aspect-[4/5] w-28 shrink-0 sm:w-36" rounded="xl" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-4 pr-4">
          <Skeleton className="h-3 w-20" rounded="md" />
          <Skeleton className="h-4 w-full max-w-[14rem]" rounded="md" />
          <Skeleton className="h-5 w-24" rounded="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Skeleton className="aspect-[3/4] w-full shadow-sm ring-1 ring-black/[0.04]" rounded="lg" />
      <div className="mt-3 space-y-2 px-0.5">
        <Skeleton className="h-4 w-full" rounded="md" />
        <Skeleton className="h-4 w-[66%] max-w-[12rem]" rounded="md" />
      </div>
    </div>
  );
}
