import { AdminAppShell } from "@/components/admin/AdminAppShell";
import { requireStaff } from "@/lib/admin-auth";

export default async function AdminDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireStaff("/admin");

  return (
    <AdminAppShell
      userEmail={session.user.email ?? ""}
      userName={session.user.name}
      userImage={session.user.image}
      userRole={session.user.role}
    >
      {children}
    </AdminAppShell>
  );
}
