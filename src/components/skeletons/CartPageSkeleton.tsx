import { Skeleton } from "@/components/ui/skeleton";

export function CartPageSkeleton() {
  return (
    <main className="min-h-screen bg-[#f8f5f6] py-10">
      <div className="section-shell">
        <Skeleton className="h-9 w-48 max-w-full" rounded="lg" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-4">
            {[1, 2].map((i) => (
              <li key={i} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
                <Skeleton className="h-28 w-24 shrink-0 rounded-lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
                  <Skeleton className="h-5 w-3/4" rounded="md" />
                  <Skeleton className="h-4 w-32" rounded="md" />
                  <Skeleton className="h-8 w-24" rounded="md" />
                </div>
              </li>
            ))}
          </ul>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <Skeleton className="h-5 w-24" rounded="md" />
              <Skeleton className="mt-6 h-4 w-full" rounded="md" />
              <Skeleton className="mt-3 h-4 w-full" rounded="md" />
              <Skeleton className="mt-8 h-12 w-full rounded-full" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
