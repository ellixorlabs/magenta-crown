import { Suspense } from "react";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { SiteMainShell } from "@/components/layout/SiteMainShell";
import { SiteNavbarSkeleton } from "@/components/layout/SiteNavbarSkeleton";
import { SiteNavWithData } from "@/components/layout/SiteNavWithData";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Suspense fallback={<SiteNavbarSkeleton />}>
        <SiteNavWithData />
      </Suspense>
      <SiteMainShell>{children}</SiteMainShell>
      <ConditionalFooter />
    </>
  );
}
