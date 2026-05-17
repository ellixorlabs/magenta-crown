"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePwaStandalone } from "@/context/PwaStandaloneContext";

const links = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" }
];

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isPwa = usePwaStandalone();
  const isPwaProfile =
    isPwa && (pathname === "/account/profile" || pathname.startsWith("/account/profile/"));

  if (isPwaProfile) {
    return <div className="min-h-[100dvh] bg-[#F5F1E9]">{children}</div>;
  }

  return (
    <div className={`min-h-screen bg-[#f8f5f6] ${isPwa ? "py-5" : "py-10"}`}>
      <div className={`section-shell flex flex-col ${isPwa ? "gap-5" : "gap-8"} lg:flex-row`}>
        <aside className={`w-full shrink-0 lg:w-56 ${isPwa ? "hidden lg:block" : ""}`}>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">My account</p>
            <nav className="mt-4 flex flex-col gap-2">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "border border-crown-200 bg-crown-50 text-crown-900"
                        : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
