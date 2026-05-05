import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { cleanupUnverifiedUsersOlderThan24h } from "@/lib/auth-cleanup";

export async function POST() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isAdminRole(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { scanned, deleted } = await cleanupUnverifiedUsersOlderThan24h();
    return NextResponse.json({ ok: true, scanned, deleted });
  } catch {
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }
}

