import { Skeleton } from "@/components/ui/skeleton";

export function SiteNavbarSkeleton() {
  return (
    <header className="pointer-events-none fixed left-0 right-0 top-0 z-50 border-b border-zinc-200/60 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="section-shell flex h-[4.5rem] items-center justify-between gap-4 sm:h-[5.25rem]">
        <Skeleton className="h-9 w-36 sm:w-40" rounded="lg" />
        <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
          <Skeleton className="h-4 w-14" rounded="md" />
          <Skeleton className="h-4 w-14" rounded="md" />
          <Skeleton className="h-4 w-16" rounded="md" />
          <Skeleton className="h-4 w-14" rounded="md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" rounded="full" />
          <Skeleton className="h-9 w-9 rounded-full" rounded="full" />
        </div>
      </div>
    </header>
  );
}
