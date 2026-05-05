"use client";

import { SiteSharedRouteBody } from "@/components/layout/SiteSharedRouteBody";

/** Status-bar safe-area strip when the marketing header is hidden (installed app). */
export function AppLayoutChrome() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[4800] h-[env(safe-area-inset-top,0px)] bg-mc-cream"
      aria-hidden
    />
  );
}

/** Full installed-app shell: minimal top chrome, main + tab bar, no marketing footer. */
export function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AppLayoutChrome />
      <SiteSharedRouteBody>{children}</SiteSharedRouteBody>
    </>
  );
}
