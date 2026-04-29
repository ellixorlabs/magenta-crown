import { SiteNavbar } from "@/components/features/SiteNavbar";
import { getActiveHeaderNavLinks } from "@/lib/site/header-nav";

/** Server-only nav shell — lives outside `/components` so Prisma never sits next to client UI modules. */
export async function SiteNavWithData() {
  const headerLinks = await getActiveHeaderNavLinks();
  return <SiteNavbar serverLinks={headerLinks} />;
}
