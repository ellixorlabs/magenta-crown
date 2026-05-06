"use client";

import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { SiteSharedRouteBody } from "@/components/layout/SiteSharedRouteBody";

export default function WebLayout({
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
