import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSupabaseUserFromRequest,
  resolveAppUserIdFromSupabaseUser,
  unauthorized
} from "@/lib/supabase-server-auth";

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

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { deletionRequestedAt: true, deletionScheduledFor: true }
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    deletionRequestedAt: row.deletionRequestedAt?.toISOString() ?? null,
    deletionScheduledFor: row.deletionScheduledFor?.toISOString() ?? null
  });
}

export async function POST(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();
  const userId = await resolveAppUserIdFromSupabaseUser(user);
  if (!userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { requestedAt, scheduledFor } = computeDeletionDates();
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletionRequestedAt: requestedAt,
      deletionScheduledFor: scheduledFor
    }
  });
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

  await prisma.user.update({
    where: { id: userId },
    data: {
      deletionRequestedAt: null,
      deletionScheduledFor: null
    }
  });
  return NextResponse.json({ ok: true });
}

