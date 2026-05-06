import { NextResponse } from "next/server";
import type { UserRow } from "@/lib/db/app-types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { getSupabaseUserFromRequest, unauthorized } from "@/lib/supabase-server-auth";

export async function POST(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return unauthorized();

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Missing required identity fields." }, { status: 400 });
  }

  const metaName =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "";
  const fallbackName = email.split("@")[0] ?? "Customer";
  const name = metaName || fallbackName;
  const supabase = getSupabaseServiceRoleClient();
  const selectUser = "id,role,onboardingComplete";
  const existingById = await supabase
    .from("User")
    .select(selectUser)
    .eq("id", user.id)
    .maybeSingle<UserRow>();
  const existingByEmail =
    existingById.data || !email
      ? null
      : await supabase.from("User").select(selectUser).eq("email", email).maybeSingle<UserRow>();
  const existing = existingById.data ?? existingByEmail?.data ?? null;
  const targetId = existing?.id ?? user.id;
  const onboardingComplete = existing?.onboardingComplete ?? true;

  const nowIso = new Date().toISOString();
  if (existing) {
    // Existing account: never touch role during sign-in/session sync.
    const update = await (supabase.from("User") as any)
      .update({
        email,
        name,
        onboardingComplete,
        lastLoginAt: nowIso
      })
      .eq("id", targetId);
    if (update.error) {
      return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
    }
  } else {
    // First-time row creation only: default role is CUSTOMER.
    const insert = await (supabase.from("User") as any).insert({
      id: targetId,
      email,
      name,
      role: "CUSTOMER",
      onboardingComplete: true,
      lastLoginAt: nowIso
    });
    if (insert.error) {
      return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

