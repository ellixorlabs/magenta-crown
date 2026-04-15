import { SiteNavbar } from "@/components/features/SiteNavbar";
import { prisma } from "@/lib/prisma";

export async function SiteNavWithData() {
  const headerLinks = await prisma.headerNavLink.findMany({
    where: { isActive: true },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
    select: { label: true, href: true, group: true }
  });

  return <SiteNavbar serverLinks={headerLinks} />;
}
