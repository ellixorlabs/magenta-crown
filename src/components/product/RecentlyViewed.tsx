"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { swrJsonFetcher } from "@/lib/swr-fetcher";

type Mini = { id: string; slug: string; name: string; imageUrls: string[]; mrp: number; discountedPrice: number | null };

export function RecentlyViewed({ excludeId }: { excludeId: string }) {
  const idsQuery = useMemo(() => {
    if (typeof window === "undefined") return "";
    const raw = localStorage.getItem("magenta-crown-recent");
    if (!raw) return "";
    const ids = (JSON.parse(raw) as string[]).filter((id) => id !== excludeId);
    if (ids.length === 0) return "";
    return encodeURIComponent(ids.slice(0, 8).join(","));
  }, [excludeId]);

  const { data } = useSWR<{ products: Mini[] }>(
    idsQuery ? `/api/products/by-ids?ids=${idsQuery}` : null,
    swrJsonFetcher,
    { dedupingInterval: 20_000 }
  );
  const items = data?.products ?? [];

  if (items.length === 0) return null;

  return (
    <section className="section-shell border-t border-zinc-200 py-12">
      <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-zinc-900">Recently viewed</h2>
      <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
        {items.map((p) => {
          const img = p.imageUrls[0] ?? "/branding/mc-loader-logo.png";
          const price = p.discountedPrice ?? p.mrp;
          return (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="w-40 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              <div className="relative h-44 w-full min-h-0">
                <div className="relative h-full w-full min-h-0">
                  <Image src={img} alt={p.name} fill className="object-cover" sizes="160px" />
                </div>
              </div>
              <div className="p-2">
                <p className="line-clamp-2 text-xs font-medium text-zinc-900">{p.name}</p>
                <p className="mt-1 text-sm text-crown-800">Rs {price}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
