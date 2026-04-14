import Link from "next/link";

const cats = [
  { label: "Sarees", href: "/shop?category=Sarees" },
  { label: "Lehengas", href: "/shop?category=Lehengas" },
  { label: "Kurtas", href: "/shop?category=Kurtas" },
  { label: "Anarkalis", href: "/shop?category=Anarkalis" },
  { label: "Gowns", href: "/shop?category=Gowns" },
  { label: "Festive", href: "/shop?occasion=Festive" },
  { label: "Wedding", href: "/shop?occasion=Wedding" }
];

export const metadata = { title: "Categories | Magenta Crown" };

export default function CategoriesPage() {
  return (
    <main className="min-h-screen py-12">
      <div className="section-shell">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">Categories</h1>
        <p className="mt-2 text-zinc-600">
          Browse by category or occasion. Open the shop for grid/list layout and price filters.
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {cats.map((c) => (
            <li key={c.href} className="min-h-[120px]">
              <Link
                href={c.href}
                className="flex h-full min-h-[120px] items-center justify-center rounded-2xl border border-zinc-200/90 bg-white/80 px-4 py-8 text-center text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-crown-400 hover:shadow-md active:scale-[0.99] sm:text-base"
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
