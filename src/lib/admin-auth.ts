import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type StaffSession = Session & {
  user: NonNullable<Session["user"]> & { id: string };
};

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
