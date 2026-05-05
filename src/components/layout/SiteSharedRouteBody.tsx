"use client";

import { SiteMainShell } from "@/components/layout/SiteMainShell";
import { McBottomTabBar } from "@/components/mc/McBottomTabBar";

/** Shared main column + mobile tab bar — used by both web and PWA shells to avoid duplicating layout logic. */
export function SiteSharedRouteBody({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteMainShell>{children}</SiteMainShell>
      <McBottomTabBar />
    </>
  );
}
