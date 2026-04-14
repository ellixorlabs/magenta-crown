import Link from "next/link";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";

const allLinks = [
  { href: "/admin", label: "Overview", adminOnly: false },
  { href: "/admin/users", label: "Customers", adminOnly: false },
  { href: "/admin/inventory", label: "Inventory & products", adminOnly: false },
  { href: "/admin/orders", label: "Orders", adminOnly: false },
  { href: "/admin/homepage", label: "Homepage layout", adminOnly: true },
  { href: "/admin/hero", label: "Homepage hero", adminOnly: true },
  { href: "/admin/coupons", label: "Coupons", adminOnly: true },
  { href: "/admin/navigation", label: "Header & menus", adminOnly: true }
];

export default async function AdminDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireStaff("/admin");
  const admin = isAdminRole(session.user.role);
  const links = allLinks.filter((l) => !l.adminOnly || admin);

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="border-b border-zinc-200 bg-white">
        <div className="section-shell flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Magenta Crown</p>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
              Boutique admin
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Staff area — signed in as <span className="font-medium">{session.user.email}</span>
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-crown-800 underline">
            View storefront
          </Link>
        </div>
        <nav className="section-shell flex flex-wrap gap-2 border-t border-zinc-100 py-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-800 hover:border-crown-400"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="section-shell py-10">{children}</div>
    </div>
  );
}
