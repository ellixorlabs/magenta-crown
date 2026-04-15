import { auth } from "@/auth";
import { AdminDashboardReport } from "@/components/admin/AdminDashboardReport";
import { isAdminRole } from "@/lib/admin-auth";
import { getAdminDashboardAnalytics } from "@/lib/admin-analytics";

export const metadata = { title: "Overview | Admin | Magenta Crown" };

export default async function AdminHomePage() {
  const session = await auth();
  const admin = isAdminRole(session?.user?.role);
  const data = await getAdminDashboardAnalytics();

  return <AdminDashboardReport data={data} showStaffNote={admin} />;
}
