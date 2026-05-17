import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isFullAdmin } from "@/lib/admin-permissions";
import { scanStorageHygiene } from "@/lib/storage-hygiene-scan";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isFullAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await scanStorageHygiene();
    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Scan failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
