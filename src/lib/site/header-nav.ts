import "server-only";

import { prisma } from "@/lib/prisma";

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
    const links = await prisma.headerNavLink.findMany({
      where: { isActive: true },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
      select: { label: true, href: true, group: true }
    });
    cache = { expiresAt: now + TTL_MS, links };
    return links;
  } catch (e) {
    console.error("getActiveHeaderNavLinks: failed to load header links.", e);
    return undefined;
  }
}
