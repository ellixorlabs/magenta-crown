import { NextResponse } from "next/server";
import { cleanupUnverifiedUsersOlderThan24h } from "@/lib/auth-cleanup";

function isAuthorized(req: Request) {
  const required = process.env.CRON_SECRET?.trim();
  if (!required) return true;
  const authz = req.headers.get("authorization") ?? "";
  return authz === `Bearer ${required}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { scanned, deleted } = await cleanupUnverifiedUsersOlderThan24h();
    return NextResponse.json({
      ok: true,
      scanned,
      deleted
    });
  } catch {
    console.error("[cron] unverified cleanup failed");
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }
}

