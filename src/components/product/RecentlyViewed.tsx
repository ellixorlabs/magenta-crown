"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Mini = { id: string; slug: string; name: string; imageUrls: string[]; mrp: number; discountedPrice: number | null };

export function RecentlyViewed({ excludeId }: { excludeId: string }) {
  const [items, setItems] = useState<Mini[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("magenta-crown-recent");
    if (!raw) return;
    const ids = (JSON.parse(raw) as string[]).filter((id) => id !== excludeId);
    if (ids.length === 0) return;
    const q = encodeURIComponent(ids.slice(0, 8).join(","));
    fetch(`/api/products/by-ids?ids=${q}`)
      .then((r) => r.json())
      .then((data: { products: Mini[] }) => setItems(data.products ?? []))
      .catch(() => {});
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="section-shell border-t border-zinc-200 py-12">
      <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-zinc-900">Recently viewed</h2>
      <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
        {items.map((p) => {
          const img =
            p.imageUrls[0] ??
            "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=400&q=80";
          const price = p.discountedPrice ?? p.mrp;
          return (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="w-40 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              <div className="relative h-44">
                <Image src={img} alt={p.name} fill className="object-cover" sizes="160px" />
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
