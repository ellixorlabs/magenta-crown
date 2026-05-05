"use client";

import { AppLayoutChrome } from "@/components/layout/AppLayout";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { SiteSharedRouteBody } from "@/components/layout/SiteSharedRouteBody";
import { PwaStandaloneProvider, usePwaStandalone } from "@/context/PwaStandaloneContext";
import type { ReactNode } from "react";

/**
 * Picks web vs installed-app chrome without remounting the shared route body
 * (single SiteSharedRouteBody subtree for the whole session).
 */
function RootLayoutSwitch({
  webChrome,
  children
}: Readonly<{ webChrome: ReactNode; children: ReactNode }>) {
  const isPwa = usePwaStandalone();

  return (
    <>
      {isPwa ? <AppLayoutChrome /> : webChrome}
      <SiteSharedRouteBody>{children}</SiteSharedRouteBody>
      {isPwa ? null : <ConditionalFooter />}
    </>
  );
}

export function RootWrapper({
  webChrome,
  children
}: Readonly<{ webChrome: ReactNode; children: ReactNode }>) {
  return (
    <PwaStandaloneProvider>
      <RootLayoutSwitch webChrome={webChrome}>{children}</RootLayoutSwitch>
    </PwaStandaloneProvider>
  );
}
