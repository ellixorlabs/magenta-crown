"use client";

import { AppLayoutChrome } from "@/components/layout/AppLayout";
import { SiteSharedRouteBody } from "@/components/layout/SiteSharedRouteBody";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AppLayoutChrome />
      <SiteSharedRouteBody>{children}</SiteSharedRouteBody>
    </>
  );
}
