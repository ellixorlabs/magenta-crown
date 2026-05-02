import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <div>
      <Skeleton className="h-4 w-28" rounded="md" />
      <Skeleton className="mt-8 h-7 w-48" rounded="lg" />
      <Skeleton className="mt-2 h-4 w-40" rounded="md" />
      <Skeleton className="mt-8 h-32 w-full max-w-lg" rounded="xl" />
      <div className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <Skeleton className="h-5 w-24" rounded="md" />
        <Skeleton className="h-20 w-full" rounded="lg" />
        <Skeleton className="h-20 w-full" rounded="lg" />
      </div>
    </div>
  );
}
