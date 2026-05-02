import "server-only";

import { NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function getSupabaseUserFromRequest(req: Request) {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await getSupabaseServiceRoleClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function resolveAppUserIdFromSupabaseUser(user: { id: string; email?: string | null }) {
  const supabase = getSupabaseServiceRoleClient();
  const byIdResult = await supabase.from("User").select("id").eq("id", user.id).maybeSingle();
  const byId = byIdResult.data as { id: string } | null;
  if (byId?.id) return byId.id;
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;
  const byEmailResult = await supabase.from("User").select("id").eq("email", email).maybeSingle();
  const byEmail = byEmailResult.data as { id: string } | null;
  return byEmail?.id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

