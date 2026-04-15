import type { LucideIcon } from "lucide-react";
import { Home, LayoutDashboard, LogOut, Package, Percent, Settings2, ShoppingCart, Users } from "lucide-react";

export type AdminNavChild = { href: string; label: string };

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Sub-links under this section (sidebar accordion). */
  children?: AdminNavChild[];
  /** Paths that mark this section active (prefix match). Required when `children` is set. */
  activePathPrefixes?: string[];
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  {
    href: "/admin/inventory",
    label: "Products",
    icon: Package,
    activePathPrefixes: ["/admin/inventory"],
    children: [
      { href: "/admin/inventory", label: "All products" },
      { href: "/admin/inventory/new", label: "Add product" }
    ]
  },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Customers", icon: Users },
  {
    href: "/admin/homepage",
    label: "Homepage",
    icon: Home,
    adminOnly: true,
    activePathPrefixes: ["/admin/homepage", "/admin/hero"],
    children: [
      { href: "/admin/homepage", label: "Layout & sections" },
      { href: "/admin/hero", label: "Hero carousel" }
    ]
  },
  { href: "/admin/coupons", label: "Coupons", icon: Percent, adminOnly: true },
  { href: "/admin/navigation", label: "Header & menus", icon: Settings2, adminOnly: true }
];

export { LogOut };
