"use client";

import { SiteSharedRouteBody } from "@/components/layout/SiteSharedRouteBody";
import BottomNavigation from "@/components/app/BottomNavigation";
import AppShell from "@/components/app/AppShell";
import AppNavbar from "@/components/app/AppNavbar";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell>
      <AppNavbar />
      <SiteSharedRouteBody>{children}</SiteSharedRouteBody>
      <BottomNavigation />
    </AppShell>
  );
}
