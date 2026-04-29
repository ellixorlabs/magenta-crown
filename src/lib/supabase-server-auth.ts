import "server-only";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";

export async function getSupabaseUserFromRequest(req: Request) {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function resolveAppUserIdFromSupabaseUser(user: { id: string; email?: string | null }) {
  const byId = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true }
  });
  if (byId?.id) return byId.id;
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;
  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });
  return byEmail?.id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

