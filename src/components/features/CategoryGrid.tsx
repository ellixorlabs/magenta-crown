import Image from "next/image";
import Link from "next/link";
import type { CategoryItem } from "@/lib/home-page-types";

type Props = {
  eyebrow: string;
  title: string;
  items: CategoryItem[];
};

export function CategoryGrid({ eyebrow, title, items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="section-shell py-16">
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl">
            {title}
          </h2>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((category) => (
          <Link
            key={category.title + category.href}
            href={category.href}
            className="group relative block h-[380px] overflow-hidden rounded-3xl border border-zinc-200"
          >
            <Image
              src={category.imageUrl}
              alt={category.title}
              fill
              className="object-cover transition duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 p-6 text-white">
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Explore</p>
              <h3 className="text-2xl font-medium">{category.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
