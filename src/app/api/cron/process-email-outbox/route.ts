import { NextResponse } from "next/server";
import { processEmailOutboxBatch } from "@/lib/process-email-outbox";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

function isAuthorized(req: Request) {
  const required = process.env.CRON_SECRET?.trim();
  if (!required) return true;
  const authz = req.headers.get("authorization") ?? "";
  return authz === `Bearer ${required}`;
}

/** Cron: drain transactional email outbox (Resend). Schedule every 1–5 min. */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const result = await processEmailOutboxBatch(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "worker failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
