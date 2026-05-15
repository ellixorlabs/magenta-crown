import { SiteNavbar } from "@/components/features/SiteNavbar";
import { getBrandSettings } from "@/lib/brand-settings";
import { getCachedHeaderNavLinks } from "@/lib/site/header-nav";

/** Server-only nav shell — lives outside `/components` so Prisma never sits next to client UI modules. */
export async function SiteNavWithData() {
  const [headerLinks, brandSettings] = await Promise.all([getCachedHeaderNavLinks(), getBrandSettings()]);
  return (
    <SiteNavbar
      serverLinks={headerLinks}
      brandMark={{
        brandMarkMode: brandSettings.brandMarkMode,
        brandText: brandSettings.brandText,
        brandImageUrl: brandSettings.brandImageUrl,
        brandFontFamily: brandSettings.brandFontFamily
      }}
    />
  );
}
