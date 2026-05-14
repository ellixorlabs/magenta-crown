import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import type { AppRole, UserRow } from "@/lib/db/app-types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export type AppSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: AppRole;
  };
};

export const AUTH_COOKIE = "mc-access-token";

async function readAuthSession(): Promise<AppSession | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value?.trim();
  if (!token) return null;

  const { data, error } = await getSupabaseServiceRoleClient().auth.getUser(token);
  if (error || !data.user) return null;

  const email = data.user.email?.trim().toLowerCase();
  const supabase = getSupabaseServiceRoleClient();
  const selectUser =
    "id,email,name,image,role,deletionScheduledFor";
  const byId = await supabase.from("User").select(selectUser).eq("id", data.user.id).maybeSingle<UserRow>();
  const byEmail =
    byId.data || !email
      ? null
      : await supabase.from("User").select(selectUser).eq("email", email).maybeSingle<UserRow>();
  const row = byId.data ?? byEmail?.data ?? null;
  if (!row) return null;
  const deletionTs = row.deletionScheduledFor ? new Date(row.deletionScheduledFor).getTime() : null;
  if (deletionTs != null && deletionTs <= Date.now()) {
    await supabase.from("User").delete().eq("id", row.id);
    return null;
  }

  return {
    user: {
      id: row.id,
      email: row.email ?? data.user.email ?? "",
      name: row.name,
      image: row.image,
      role: row.role as AppRole
    }
  };
}

/** Per-request dedupe: layout + page + route handlers calling `auth()` share one execution. */
export const auth = cache(readAuthSession);
