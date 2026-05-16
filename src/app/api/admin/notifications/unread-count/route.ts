import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isStaffRole } from "@/lib/admin-permissions";
import { countUnreadNotificationsForUser } from "@/lib/ops-notifications";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseServiceRoleClient();
  const count = await countUnreadNotificationsForUser(supabase, session.user.id);
  return NextResponse.json({ count });
}
