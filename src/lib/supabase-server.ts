import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase-env";

export async function getSupabaseServerClientOrNull() {
  const cfg = getSupabasePublicConfig();
  if (!cfg) return null;
  const cookieStore = await cookies();
  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          try {
            cookieStore.set(c.name, c.value, c.options);
          } catch {
            // Safe in RSC where writing cookies may be unavailable.
          }
        }
      }
    }
  });
}

export async function getSupabaseServerClient() {
  const client = await getSupabaseServerClientOrNull();
  if (!client) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return client;
}

export function getSupabaseServerClientWithToken(token: string): SupabaseClient {
  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}
