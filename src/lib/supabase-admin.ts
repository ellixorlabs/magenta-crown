import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleConfig } from "@/lib/supabase-env";

let cached:
  | ReturnType<typeof createClient>
  | null = null;

export function getSupabaseServiceRoleClient() {
  if (cached) return cached;
  const cfg = getSupabaseServiceRoleConfig();
  if (!cfg) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  cached = createClient(cfg.url, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}

export const getSupabaseAdmin = getSupabaseServiceRoleClient;

