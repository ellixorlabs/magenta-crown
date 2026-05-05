import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export type UnverifiedCleanupResult = {
  scanned: number;
  deleted: number;
};

export async function cleanupUnverifiedUsersOlderThan24h(): Promise<UnverifiedCleanupResult> {
  const supabase = getSupabaseServiceRoleClient();
  const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
  let page = 1;
  const perPage = 200;
  let scanned = 0;
  let deleted = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });
    if (error) throw new Error("LIST_USERS_FAILED");

    const users = data?.users ?? [];
    if (users.length === 0) break;
    scanned += users.length;

    for (const user of users) {
      const createdAt = user.created_at ? Date.parse(user.created_at) : NaN;
      const emailVerifiedAt = user.email_confirmed_at ? Date.parse(user.email_confirmed_at) : NaN;
      const isEmailVerified = Number.isFinite(emailVerifiedAt);
      const isOlderThan24h = Number.isFinite(createdAt) && createdAt <= cutoffMs;
      if (isEmailVerified || !isOlderThan24h) continue;

      const deleteAuthRes = await supabase.auth.admin.deleteUser(user.id);
      if (deleteAuthRes.error) continue;
      await supabase.from("User").delete().eq("id", user.id);
      deleted += 1;
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return { scanned, deleted };
}

