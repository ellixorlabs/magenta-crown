import Link from "next/link";

const links = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" }
];

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f8f5f6] py-10">
      <div className="section-shell flex flex-col gap-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">My account</p>
          <nav className="mt-4 flex flex-col gap-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-zinc-800 hover:bg-white">
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
