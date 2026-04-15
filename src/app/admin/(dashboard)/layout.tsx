import { AdminAppShell } from "@/components/admin/AdminAppShell";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";

export default async function AdminDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireStaff("/admin");
  const admin = isAdminRole(session.user.role);

  return (
    <AdminAppShell
      userEmail={session.user.email ?? ""}
      userName={session.user.name}
      userImage={session.user.image}
      isAdmin={admin}
    >
      {children}
    </AdminAppShell>
  );
}
