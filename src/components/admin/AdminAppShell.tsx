"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminNavItem } from "@/lib/admin-nav";
import { ADMIN_NAV, LogOut } from "@/lib/admin-nav";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

function sectionIsActive(item: AdminNavItem, pathname: string | null) {
  if (!item.activePathPrefixes?.length || !pathname) return false;
  return item.activePathPrefixes.some((p) => pathname.startsWith(p));
}

function childIsActive(pathname: string | null, childHref: string) {
  if (!pathname) return false;
  if (pathname === childHref) return true;
  // Keep inventory submenu precise: only highlight the exact leaf page.
  if (childHref === "/admin/inventory" || childHref === "/admin/inventory/new") return false;
  return pathname.startsWith(`${childHref}/`);
}

function pageTitle(pathname: string) {
  const exact: Record<string, string> = {
    "/admin": "Overview",
    "/admin/inventory": "Products",
    "/admin/inventory/new": "New product",
    "/admin/orders": "Orders",
    "/admin/users": "Customers",
    "/admin/homepage": "Layout & sections",
    "/admin/hero": "Hero carousel",
    "/admin/coupons": "Coupons",
    "/admin/navigation": "Header & menus"
  };
  if (exact[pathname]) return exact[pathname];
  if (pathname.startsWith("/admin/orders/") && pathname !== "/admin/orders") return "Order details";
  if (pathname.startsWith("/admin/inventory/")) return "Edit product";
  return "Admin";
}

export function AdminAppShell({
  children,
  userEmail,
  userName,
  userImage,
  isAdmin
}: {
  children: React.ReactNode;
  userEmail: string;
  userName?: string | null;
  userImage?: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const links = useMemo(() => ADMIN_NAV.filter((l) => !l.adminOnly || isAdmin), [isAdmin]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);
  /** Manual accordion overrides; if unset, derive open state from current path. */
  const [navOpen, setNavOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // If any storefront sheet left body locked, unblock scroll in admin.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (profileWrapRef.current?.contains(e.target as Node)) return;
      setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const title = pageTitle(pathname ?? "");

  const linkActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="h-dvh overflow-x-hidden bg-[#f4f6f9] lg:flex">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,16rem)] max-w-[85vw] flex-col border-r border-zinc-200/90 bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-xl transition-transform duration-200 ease-out lg:relative lg:z-0 lg:min-h-dvh lg:w-64 lg:max-w-none lg:pb-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-100 px-5">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="min-w-0 flex-1"
          >
            <span className="font-site-brand block truncate text-[13px] font-semibold leading-tight tracking-[0.2em] text-zinc-900 sm:text-sm">
              MAGENTA CROWN
            </span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Boutique admin
            </span>
          </Link>
          <button
            type="button"
            className="ml-auto rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {links.map((item) => {
            const Icon = item.icon;
            const active = linkActive(item.href);

            if (item.children?.length) {
              const subActive = sectionIsActive(item, pathname);
              const expanded = navOpen[item.href] ?? subActive;
              return (
                <div key={item.href} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = navOpen[item.href] ?? sectionIsActive(item, pathname);
                      setNavOpen((o) => ({ ...o, [item.href]: !cur }));
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                      subActive
                        ? "bg-admin-50 text-admin-800"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
                    <span className="flex-1">{item.label}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`}
                      strokeWidth={1.75}
                    />
                  </button>
                  {expanded && (
                    <div className="ml-2 space-y-0.5 border-l-2 border-admin-100 pl-3">
                      {item.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          onClick={() => setMobileOpen(false)}
                          className={`block rounded-lg px-3 py-2 text-sm transition ${
                            childIsActive(pathname, c.href)
                              ? "bg-admin-50 font-medium text-admin-800"
                              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                          }`}
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-admin-50 text-admin-800" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-200/90 bg-white/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm hover:bg-zinc-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Report & analytics</p>
              <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">{title}</h1>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <form action="/admin/users" method="get" className="relative hidden min-w-[200px] flex-1 sm:max-w-xs md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                name="q"
                type="search"
                placeholder="Search customers…"
                className="w-full rounded-full border border-zinc-200 bg-zinc-50/80 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-admin-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-admin-200"
              />
            </form>
            <button
              type="button"
              className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <div className="relative" ref={profileWrapRef}>
              <button
                type="button"
                id="admin-profile-menu-button"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-controls="admin-profile-menu"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50/90 py-1 pl-1 pr-2.5 text-left shadow-sm transition hover:bg-zinc-100"
              >
                {userImage ? (
                  <Image
                    src={userImage}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full border border-white object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-admin-100 text-xs font-bold text-admin-800">
                    {(userName ?? userEmail ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="hidden max-w-[160px] truncate text-sm font-medium text-zinc-800 sm:inline">
                  {userName || userEmail}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition ${profileOpen ? "rotate-180" : ""}`}
                />
              </button>
              {profileOpen ? (
                <div
                  id="admin-profile-menu"
                  role="menu"
                  aria-labelledby="admin-profile-menu-button"
                  className="absolute right-0 z-50 mt-2 w-[min(13rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg sm:w-52"
                >
                  <Link
                    href="/"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm font-medium text-admin-800 hover:bg-admin-50"
                    onClick={() => {
                      setProfileOpen(false);
                      setMobileOpen(false);
                    }}
                  >
                    View storefront
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    onClick={async () => {
                      const supabase = await getSupabaseClientOrNull();
                      await supabase?.auth.signOut();
                      await fetch("/api/auth/session", { method: "DELETE" });
                      window.location.href = "/";
                    }}
                  >
                    <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
