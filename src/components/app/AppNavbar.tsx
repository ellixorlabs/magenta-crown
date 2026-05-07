"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Heart, Search, X } from "lucide-react";
import { useState } from "react";
import { useWishlistCount } from "@/context/WishlistContext";

export default function AppNavbar() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { count, hydrated } = useWishlistCount();

  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-[4800] border-b border-mc-ink/10 bg-mc-cream/95 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-mc-ink/80 transition hover:bg-black/5"
          aria-label="Go back"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
              return;
            }
            router.push("/");
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm text-zinc-500 transition hover:bg-zinc-50"
          aria-label="Search products"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="truncate">Search for ...</span>
        </button>

        <Link
          href="/account/wishlist"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-mc-ink/80 transition hover:bg-black/5"
          aria-label="Wishlist"
        >
          <Heart className="h-5 w-5" />
          {hydrated && count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white tabular-nums">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Link>
      </div>
      {searchOpen ? (
        <div className="mx-auto mt-2 flex w-full max-w-lg items-center gap-2 px-4 pb-2">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchOpen(false);
                return;
              }
              if (e.key !== "Enter") return;
              const q = query.trim();
              router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
              setSearchOpen(false);
            }}
            placeholder="Search products..."
            className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 outline-none ring-crown-700/20 transition focus:border-crown-700 focus:ring-2"
          />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-mc-ink/80 transition hover:bg-black/5"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </header>
  );
}

