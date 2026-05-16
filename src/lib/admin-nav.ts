import type { LucideIcon } from "lucide-react";
import { Home, LayoutDashboard, LogOut, Package, Percent, Settings2, ShoppingCart, Users } from "lucide-react";

/** Who sees this nav entry (see `src/lib/admin-permissions.ts`). */
export type AdminNavSection = "staff" | "merch" | "admin";

export type AdminNavChild = { href: string; label: string; section?: AdminNavSection };

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Default `staff` when omitted. */
  section?: AdminNavSection;
  children?: AdminNavChild[];
  activePathPrefixes?: string[];
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, section: "staff" },
  {
    href: "/admin/inventory",
    label: "Inventory",
    icon: Package,
    section: "staff",
    activePathPrefixes: ["/admin/inventory"],
    children: [
      { href: "/admin/inventory", label: "All Products" },
      { href: "/admin/inventory/new", label: "Add Product", section: "merch" },
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
    section: "staff",
    activePathPrefixes: ["/admin/orders", "/admin/returns"],
    children: [
      { href: "/admin/orders", label: "All Orders" },
      { href: "/admin/orders?orderStatus=ORDER_PLACED", label: "Placed" },
      { href: "/admin/orders?orderStatus=PROCESSING", label: "Processing" },
      { href: "/admin/orders?orderStatus=SHIPPED", label: "Shipped" },
      { href: "/admin/orders?orderStatus=OUT_FOR_DELIVERY", label: "Out for delivery" },
      { href: "/admin/orders?orderStatus=DELIVERED", label: "Delivered" },
      { href: "/admin/orders?orderStatus=CANCELLED", label: "Cancelled" },
      { href: "/admin/orders?returns=1", label: "Returns pipeline" },
      { href: "/admin/returns", label: "Return & exchange ops" }
    ]
  },
  { href: "/admin/users", label: "Customers", icon: Users, section: "merch" },
  {
    href: "/admin/homepage",
    label: "Homepage",
    icon: Home,
    /** Staff (incl. TECH) need merchandising tools; writes still gated in server actions. */
    section: "staff",
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
    section: "staff",
    activePathPrefixes: ["/admin/coupons"],
    children: [
      { href: "/admin/coupons", label: "Coupons" },
      { href: "/admin/inventory?featured=1", label: "Featured Products", section: "staff" },
      { href: "/admin/others", label: "Brand & auth visuals" }
    ]
  },
  {
    href: "/admin/navigation",
    label: "Navigation",
    icon: Settings2,
    section: "staff",
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
    section: "admin",
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
