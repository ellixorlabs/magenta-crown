"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";
import { LogOut } from "@/lib/admin-nav";
import { canViewAdminCustomers } from "@/lib/admin-permissions";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

function pageTitle(pathname: string) {
  const exact: Record<string, string> = {
    "/admin": "Overview",
    "/admin/inventory/categories": "Categories",
    "/admin/inventory/reviews": "Product reviews",
    "/admin/others": "Brand & auth settings",
    "/admin/orders": "Orders",
    "/admin/returns": "Returns & exchanges",
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

function AdminSidebarFallback({ mobileOpen }: { mobileOpen: boolean }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,16rem)] max-w-[85vw] flex-col border-r border-zinc-200/90 bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-xl transition-transform duration-200 ease-out lg:relative lg:z-0 lg:min-h-dvh lg:w-64 lg:max-w-none lg:pb-0 lg:shadow-none ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-zinc-100 px-5">
        <span className="text-xs text-zinc-500">Loading menu…</span>
      </div>
    </aside>
  );
}

export function AdminAppShell({
  children,
  userEmail,
  userName,
  userImage,
  userRole,
  staffUserId,
  initialNotificationCount = 0
}: {
  children: React.ReactNode;
  userEmail: string;
  userName?: string | null;
  userImage?: string | null;
  userRole: string;
  staffUserId: string;
  initialNotificationCount?: number;
}) {
  const pathname = usePathname();
  const showCustomerSearch = canViewAdminCustomers(userRole);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

      <Suspense fallback={<AdminSidebarFallback mobileOpen={mobileOpen} />}>
        <AdminSidebarNav userRole={userRole} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      </Suspense>

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
            <form
              action="/admin/users"
              method="get"
              className={
                showCustomerSearch
                  ? "relative hidden min-w-[200px] flex-1 sm:max-w-xs md:block"
                  : "hidden"
              }
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                name="q"
                type="search"
                placeholder="Search customers…"
                className="w-full rounded-full border border-zinc-200 bg-zinc-50/80 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-admin-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-admin-200"
              />
            </form>
            <AdminNotificationBell staffUserId={staffUserId} initialCount={initialNotificationCount} />
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
