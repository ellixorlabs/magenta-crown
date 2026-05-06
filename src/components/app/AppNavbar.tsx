"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function AppNavbar() {
  const pathname = usePathname() ?? "";
  const { items, cartHydrated } = useCart();
  const count = items.reduce((n, it) => n + it.quantity, 0);

  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-[4800] border-b border-mc-ink/10 bg-mc-cream/95 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-mc-ink">
          MAGENTA CROWN
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/shop"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-mc-ink/80 transition hover:bg-black/5"
            aria-label="Search / shop"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-mc-ink/80 transition hover:bg-black/5"
            aria-label="Cart"
          >
            {cartHydrated && count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mc-accent px-1 text-[9px] font-bold text-white tabular-nums">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
            <ShoppingCart className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

