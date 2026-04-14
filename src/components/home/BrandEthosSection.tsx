import type { BrandEthosColumn } from "@/lib/home-page-types";

type Props = {
  columns: BrandEthosColumn[];
};

export function BrandEthosSection({ columns }: Props) {
  if (columns.length === 0) return null;

  return (
    <section className="border-y border-zinc-200 bg-white py-16">
      <div
        className={`section-shell grid gap-10 ${
          columns.length === 1 ? "md:grid-cols-1" : columns.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
        }`}
      >
        {columns.map((col) => (
          <div key={col.label}>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{col.label}</p>
            <p className="mt-3 text-zinc-800">{col.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
