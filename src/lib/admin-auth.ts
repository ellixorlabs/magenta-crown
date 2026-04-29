import { redirect } from "next/navigation";
import { auth, type AppSession } from "@/auth";

export type StaffSession = AppSession;

export async function requireStaff(callbackPath = "/admin"): Promise<StaffSession> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/admin/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUB_ADMIN") {
    redirect("/");
  }
  return session as StaffSession;
}

export function isAdminRole(role: string | undefined) {
  return role === "ADMIN";
}
