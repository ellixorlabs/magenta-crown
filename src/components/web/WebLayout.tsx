import type { ReactNode } from "react";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { SiteSharedRouteBody } from "@/components/layout/SiteSharedRouteBody";

export default function WebLayout({
  webChrome,
  footer,
  children
}: Readonly<{ webChrome: ReactNode; footer?: ReactNode; children: ReactNode }>) {
  return (
    <>
      {webChrome}
      <SiteSharedRouteBody>{children}</SiteSharedRouteBody>
      <ConditionalFooter footer={footer} />
    </>
  );
}
