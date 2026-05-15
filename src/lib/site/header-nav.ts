import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { FALLBACK_PRIMARY } from "@/lib/default-nav";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export type HeaderNavLinkRow = { label: string; href: string; group: string | null };

const loadHeaderLinksFromDb = unstable_cache(
  async (): Promise<HeaderNavLinkRow[]> => {
    console.log("HEADER FETCH", Date.now());
    const supabase = getSupabaseServiceRoleClient();
    const { data: links, error } = await (supabase.from("HeaderNavLink") as any)
      .select("label,href,group")
      .eq("isActive", true)
      .order("group", { ascending: true })
      .order("sortOrder", { ascending: true });
    if (error) throw new Error(error.message);
    return (links ?? []) as HeaderNavLinkRow[];
  },
  ["site-header-nav-active-links"],
  { revalidate: 300 }
);

function fallbackLinks(): HeaderNavLinkRow[] {
  return FALLBACK_PRIMARY.map((p) => ({ label: p.label, href: p.href, group: p.group ?? null }));
}

async function loadActiveHeaderNavLinks(): Promise<HeaderNavLinkRow[]> {
  try {
    const links = await loadHeaderLinksFromDb();
    if (!links.length) return fallbackLinks();
    return links;
  } catch {
    console.error("getActiveHeaderNavLinks: failed to load header links.");
    return fallbackLinks();
  }
}

/** Per-request dedupe + cross-request `unstable_cache` (300s). Never blocks nav: always returns rows (DB or fallback). */
export const getActiveHeaderNavLinks = cache(loadActiveHeaderNavLinks);

export const getCachedHeaderNavLinks = getActiveHeaderNavLinks;
