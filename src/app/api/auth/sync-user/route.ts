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
  const targetId = existingById.data?.id ?? existingByEmail?.data?.id ?? user.id;
  const role = existingById.data?.role ?? existingByEmail?.data?.role ?? "CUSTOMER";
  const onboardingComplete =
    existingById.data?.onboardingComplete ?? existingByEmail?.data?.onboardingComplete ?? true;

  const nowIso = new Date().toISOString();
  const upsert = await (supabase.from("User") as any).upsert(
    {
      id: targetId,
      email,
      name,
      role,
      onboardingComplete,
      lastLoginAt: nowIso
    },
    { onConflict: "id" }
  );
  if (upsert.error) {
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

