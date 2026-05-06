"use client";

import { SiteMainShell } from "@/components/layout/SiteMainShell";

/** Shared main column — reused by both web and PWA shells. */
export function SiteSharedRouteBody({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteMainShell>{children}</SiteMainShell>;
}
