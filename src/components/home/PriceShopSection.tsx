import Link from "next/link";

export type PriceBucket = { label: string; minPrice?: number; maxPrice?: number };

type Props = {
  eyebrow: string;
  title: string;
  buckets: PriceBucket[];
};

function bucketHref(b: PriceBucket): string {
  const params = new URLSearchParams();
  if (b.minPrice != null && !Number.isNaN(b.minPrice)) params.set("minPrice", String(b.minPrice));
  if (b.maxPrice != null && !Number.isNaN(b.maxPrice)) params.set("maxPrice", String(b.maxPrice));
  const q = params.toString();
  return q ? `/shop?${q}` : "/shop";
}

export function PriceShopSection({ eyebrow, title, buckets }: Props) {
  if (buckets.length === 0) return null;

  return (
    <section className="section-shell py-16">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl">
          {title}
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {buckets.map((b) => (
          <Link
            key={b.label}
            href={bucketHref(b)}
            className="group rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:border-crown-300 hover:shadow-md"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Shop</p>
            <p className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold text-zinc-900">{b.label}</p>
            <p className="mt-4 text-sm font-medium text-crown-800 group-hover:underline">Browse →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
