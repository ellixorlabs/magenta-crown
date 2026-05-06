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
    label: "Inventory",
    icon: Package,
    activePathPrefixes: ["/admin/inventory"],
    children: [
      { href: "/admin/inventory", label: "All Products" },
      { href: "/admin/inventory/new", label: "Add Product" },
      { href: "/admin/inventory?status=ARCHIVED", label: "Archived Products" },
      { href: "/admin/inventory?status=DRAFT", label: "Draft Products" },
      { href: "/admin/inventory?status=SOLD_OUT", label: "Sold Out Products" },
      { href: "/admin/inventory/categories", label: "Categories" },
      { href: "/admin/inventory/reviews", label: "Product Reviews" }
    ]
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingCart,
    activePathPrefixes: ["/admin/orders"],
    children: [
      { href: "/admin/orders", label: "All Orders" },
      { href: "/admin/orders?status=PENDING", label: "Pending" },
      { href: "/admin/orders?status=PROCESSING", label: "Processing" },
      { href: "/admin/orders?status=SHIPPED", label: "Shipped" },
      { href: "/admin/orders?status=DELIVERED", label: "Delivered" },
      { href: "/admin/orders?status=CANCELLED", label: "Cancelled" },
      { href: "/admin/orders?status=RETURNED", label: "Returns & Refunds" }
    ]
  },
  { href: "/admin/users", label: "Customers", icon: Users },
  {
    href: "/admin/homepage",
    label: "Homepage",
    icon: Home,
    adminOnly: true,
    activePathPrefixes: ["/admin/homepage", "/admin/hero"],
    children: [
      { href: "/admin/homepage", label: "Layout & sections" },
      { href: "/admin/hero", label: "Hero carousel" },
      { href: "/admin/homepage?section=featured", label: "Featured Collections" },
      { href: "/admin/homepage?section=promos", label: "Promotional Banners" }
    ]
  },
  {
    href: "/admin/coupons",
    label: "Marketing",
    icon: Percent,
    adminOnly: true,
    activePathPrefixes: ["/admin/coupons"],
    children: [
      { href: "/admin/coupons", label: "Coupons" },
      { href: "/admin/inventory?featured=1", label: "Featured Products" },
      { href: "/admin/others", label: "Announcements" }
    ]
  },
  {
    href: "/admin/navigation",
    label: "Navigation",
    icon: Settings2,
    adminOnly: true,
    activePathPrefixes: ["/admin/navigation"],
    children: [
      { href: "/admin/navigation", label: "Header Menus" },
      { href: "/admin/navigation?section=footer", label: "Footer Links" }
    ]
  },
  {
    href: "/admin/others",
    label: "Settings",
    icon: Settings2,
    adminOnly: true,
    activePathPrefixes: ["/admin/others"],
    children: [
      { href: "/admin/others", label: "Brand Settings" },
      { href: "/admin/others?tab=pwa", label: "PWA Settings" },
      { href: "/admin/others?tab=seo", label: "SEO Settings" },
      { href: "/admin/others?tab=shipping", label: "Shipping Settings" },
      { href: "/admin/others?tab=payment", label: "Payment Settings" }
    ]
  }
];

export { LogOut };
