import { Suspense } from "react";
import { SiteNavbar } from "@/components/features/SiteNavbar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { SiteMainShell } from "@/components/layout/SiteMainShell";
import { prisma } from "@/lib/prisma";

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const headerLinks = await prisma.headerNavLink.findMany({
    where: { isActive: true },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    select: { label: true, href: true, group: true }
  });

  return (
    <>
      <Suspense fallback={<div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-[4.5rem] sm:h-[5.25rem]" />}>
        <SiteNavbar serverLinks={headerLinks} />
      </Suspense>
      <SiteMainShell>{children}</SiteMainShell>
      <ConditionalFooter />
    </>
  );
}


