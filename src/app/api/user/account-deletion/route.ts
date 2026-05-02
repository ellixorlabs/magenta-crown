import { NextResponse } from "next/server";
import {
  getSupabaseUserFromRequest,
  resolveAppUserIdFromSupabaseUser,
  unauthorized
} from "@/lib/supabase-server-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

const RETENTION_DAYS = 7;

function computeDeletionDates() {
  const requestedAt = new Date();
  const scheduledFor = new Date(requestedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return { requestedAt, scheduledFor };
}

export async function GET(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();
  const userId = await resolveAppUserIdFromSupabaseUser(user);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = getSupabaseServiceRoleClient();
  const { data: row, error } = await supabase
    .from("User")
    .select("deletionRequestedAt,deletionScheduledFor")
    .eq("id", userId)
    .maybeSingle<{ deletionRequestedAt: string | null; deletionScheduledFor: string | null }>();
  if (error || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    deletionRequestedAt: row.deletionRequestedAt ? new Date(row.deletionRequestedAt).toISOString() : null,
    deletionScheduledFor: row.deletionScheduledFor ? new Date(row.deletionScheduledFor).toISOString() : null
  });
}

export async function POST(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();
  const userId = await resolveAppUserIdFromSupabaseUser(user);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { requestedAt, scheduledFor } = computeDeletionDates();
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase
    .from("User") as any)
    .update({
      deletionRequestedAt: requestedAt.toISOString(),
      deletionScheduledFor: scheduledFor.toISOString()
    })
    .eq("id", userId);
  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    deletionRequestedAt: requestedAt.toISOString(),
    deletionScheduledFor: scheduledFor.toISOString()
  });
}

export async function DELETE(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();
  const userId = await resolveAppUserIdFromSupabaseUser(user);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await (supabase
    .from("User") as any)
    .update({
      deletionRequestedAt: null,
      deletionScheduledFor: null
    })
    .eq("id", userId);
  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

