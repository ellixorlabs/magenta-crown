import { redirect } from "next/navigation";
import { auth, type AppSession } from "@/auth";
import { isFullAdmin, isMerchAdmin, isStaffRole } from "@/lib/admin-permissions";

export type StaffSession = AppSession;

export async function requireStaff(callbackPath = "/admin"): Promise<StaffSession> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/admin/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  if (!isStaffRole(session.user.role)) {
    redirect("/");
  }
  return session as StaffSession;
}

export async function requireFullAdmin(callbackPath: string): Promise<StaffSession> {
  const session = await requireStaff(callbackPath);
  if (!isFullAdmin(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

export async function requireMerchAdmin(callbackPath: string): Promise<StaffSession> {
  const session = await requireStaff(callbackPath);
  if (!isMerchAdmin(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

export {
  canAccessAdminOrders,
  canAccessAdminUsers,
  canCreateOrDeleteProducts,
  canManageBrandAssets,
  canManageCoupons,
  canManageHomepage,
  canManageInventory,
  canManageNavigation,
  canManageSiteSettings,
  isAdminRole,
  isFullAdmin,
  isMerchAdmin,
  isStaffRole,
  isStorefrontStaff
} from "@/lib/admin-permissions";
