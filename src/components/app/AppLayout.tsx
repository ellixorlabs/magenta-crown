import type { ReactNode } from "react";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { SiteSharedRouteBody } from "@/components/layout/SiteSharedRouteBody";
import BottomNavigation from "@/components/app/BottomNavigation";
import AppShell from "@/components/app/AppShell";
import AppNavbar from "@/components/app/AppNavbar";

export default function AppLayout({
  children,
  footer
}: Readonly<{ children: ReactNode; footer?: ReactNode }>) {
  return (
    <AppShell>
      <AppNavbar />
      <SiteSharedRouteBody>{children}</SiteSharedRouteBody>
      <ConditionalFooter footer={footer} />
      <BottomNavigation />
    </AppShell>
  );
}
