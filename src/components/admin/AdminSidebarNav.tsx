"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminNavChild, AdminNavItem, AdminNavSection } from "@/lib/admin-nav";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { isFullAdmin, isMerchAdmin, isStaffRole } from "@/lib/admin-permissions";

function sectionAllows(role: string | undefined, section: AdminNavSection): boolean {
  if (section === "staff") return isStaffRole(role);
  if (section === "merch") return isMerchAdmin(role);
  return isFullAdmin(role);
}

function childSection(parent: AdminNavItem, child: AdminNavChild): AdminNavSection {
  return child.section ?? parent.section ?? "staff";
}

function topLevelNavVisible(item: AdminNavItem, role: string | undefined): boolean {
  if (item.children?.length) {
    return item.children.some((c) => sectionAllows(role, childSection(item, c)));
  }
  return sectionAllows(role, item.section ?? "staff");
}

function navForRole(role: string | undefined): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => topLevelNavVisible(item, role)).map((item) => {
    if (!item.children?.length) return item;
    const children = item.children.filter((c) => sectionAllows(role, childSection(item, c)));
    return { ...item, children };
  });
}

function sectionIsActive(item: AdminNavItem, pathname: string | null) {
  if (!item.activePathPrefixes?.length || !pathname) return false;
  return item.activePathPrefixes.some((p) => pathname.startsWith(p));
}

function childIsActive(pathname: string | null, searchParams: URLSearchParams | null, childHref: string) {
  if (!pathname) return false;
  const [childPath, childQuery = ""] = childHref.split("?");
  if (childPath && pathname === childPath) {
    if (!childQuery) return true;
    if (!searchParams) return false;
    const expected = new URLSearchParams(childQuery);
    for (const [k, v] of expected.entries()) {
      if (searchParams.get(k) !== v) return false;
    }
    return true;
  }
  if (childPath === "/admin/inventory" || childPath === "/admin/inventory/new") return false;
  return pathname.startsWith(`${childPath}/`);
}

export function AdminSidebarNav({
  userRole,
  mobileOpen,
  setMobileOpen
}: {
  userRole: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const links = useMemo(() => navForRole(userRole), [userRole]);
  const [navOpen, setNavOpen] = useState<Record<string, boolean>>({});

  const linkActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,16rem)] max-w-[85vw] flex-col border-r border-zinc-200/90 bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-xl transition-transform duration-200 ease-out lg:relative lg:z-0 lg:min-h-dvh lg:w-64 lg:max-w-none lg:pb-0 lg:shadow-none ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-100 px-5">
        <Link href="/" onClick={() => setMobileOpen(false)} className="min-w-0 flex-1">
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
                    subActive ? "bg-admin-50 text-admin-800" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
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
                          childIsActive(pathname, searchParams, c.href)
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
  );
}
