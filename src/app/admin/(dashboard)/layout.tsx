import { AdminAppShell } from "@/components/admin/AdminAppShell";
import { requireStaff } from "@/lib/admin-auth";
import { countUnreadNotificationsForUser } from "@/lib/ops-notifications";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireStaff("/admin");
  let initialNotificationCount = 0;
  try {
    const supabase = getSupabaseServiceRoleClient();
    initialNotificationCount = await countUnreadNotificationsForUser(supabase, session.user.id);
  } catch {
    initialNotificationCount = 0;
  }

  return (
    <AdminAppShell
      userEmail={session.user.email ?? ""}
      userName={session.user.name}
      userImage={session.user.image}
      userRole={String(session.user.role ?? "")}
      staffUserId={session.user.id}
      initialNotificationCount={initialNotificationCount}
    >
      {children}
    </AdminAppShell>
  );
}
