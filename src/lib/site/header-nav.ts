import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export type HeaderNavLinkRow = { label: string; href: string; group: string | null };

const TTL_MS = 60_000;

let cache: { expiresAt: number; links: HeaderNavLinkRow[] } | null = null;

/** Active header links with simple in-memory TTL (matches homepage cache window). */
export async function getActiveHeaderNavLinks(): Promise<HeaderNavLinkRow[] | undefined> {
  const now = Date.now();
  if (cache && now < cache.expiresAt) {
    return cache.links;
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data: links, error } = await (supabase.from("HeaderNavLink") as any)
      .select("label,href,group")
      .eq("isActive", true)
      .order("group", { ascending: true })
      .order("sortOrder", { ascending: true });
    if (error) throw new Error(error.message);
    cache = { expiresAt: now + TTL_MS, links };
    return links;
  } catch (e) {
    console.error("getActiveHeaderNavLinks: failed to load header links.", e);
    return undefined;
  }
}
