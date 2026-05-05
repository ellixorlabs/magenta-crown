"use client";

import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { SiteSharedRouteBody } from "@/components/layout/SiteSharedRouteBody";

/** Default browser shell: server-driven header chrome, shared body, desktop footer. */
export function WebLayout({
  webChrome,
  children
}: Readonly<{ webChrome: React.ReactNode; children: React.ReactNode }>) {
  return (
    <>
      {webChrome}
      <SiteSharedRouteBody>{children}</SiteSharedRouteBody>
      <ConditionalFooter />
    </>
  );
}
