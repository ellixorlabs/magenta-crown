import type { AppRole } from "@/lib/db/app-types";

/** Canonical enum literals — never derive from DISTINCT(role) in DB. */
export const ROLE: Record<AppRole, AppRole> = {
  ADMIN: "ADMIN",
  SUB_ADMIN: "SUB_ADMIN",
  TECH_SUPPORT: "TECH_SUPPORT",
  CUSTOMER: "CUSTOMER"
};

export function isAppRole(value: string | undefined): value is AppRole {
  return (
    value === ROLE.ADMIN ||
    value === ROLE.SUB_ADMIN ||
    value === ROLE.TECH_SUPPORT ||
    value === ROLE.CUSTOMER
  );
}

/** May sign into /admin (not storefront-only). */
export function isStaffRole(role: string | undefined): boolean {
  return role === ROLE.ADMIN || role === ROLE.SUB_ADMIN || role === ROLE.TECH_SUPPORT;
}

/** Full admin: users, orders, settings, navigation, brand. */
export function isFullAdmin(role: string | undefined): boolean {
  return role === ROLE.ADMIN;
}

/** @deprecated Prefer isFullAdmin — same meaning (superuser only). */
export function isAdminRole(role: string | undefined): boolean {
  return isFullAdmin(role);
}

/** ADMIN + SUB_ADMIN — merchandising, homepage, product CRUD, coupons. */
export function isMerchAdmin(role: string | undefined): boolean {
  return role === ROLE.ADMIN || role === ROLE.SUB_ADMIN;
}

/** ADMIN + SUB_ADMIN + TECH — inventory edits, PDP media, archive, troubleshooting. */
export function canManageInventory(role: string | undefined): boolean {
  return isStaffRole(role);
}

export function canCreateOrDeleteProducts(role: string | undefined): boolean {
  return isMerchAdmin(role);
}

export function canAccessAdminOrders(role: string | undefined): boolean {
  return role === ROLE.ADMIN;
}

export function canAccessAdminUsers(role: string | undefined): boolean {
  return role === ROLE.ADMIN;
}

export function canManageHomepage(role: string | undefined): boolean {
  return isMerchAdmin(role);
}

export function canManageCoupons(role: string | undefined): boolean {
  return isMerchAdmin(role);
}

export function canManageNavigation(role: string | undefined): boolean {
  return role === ROLE.ADMIN;
}

export function canManageSiteSettings(role: string | undefined): boolean {
  return role === ROLE.ADMIN;
}

export function canManageBrandAssets(role: string | undefined): boolean {
  return role === ROLE.ADMIN;
}

/** Storefront: staff sees drafts / skips customer-only paths. */
export function isStorefrontStaff(role: string | undefined): boolean {
  return isStaffRole(role);
}
