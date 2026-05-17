import { requireStaff } from "@/lib/admin-auth";
import { clearCache } from "@/lib/cache";
import { migrateLegacyPromoBannersIfNeeded } from "@/lib/home-page-banner";
import type { HomePageBannerRow } from "@/lib/home-page-banner";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { getHomePagePayload } from "@/lib/get-home-page-config";
import { HOMEPAGE_BUNDLE_CACHE_KEY } from "@/services/home/home.service";
import { HomePageEditorClient } from "./HomePageEditorClient";

export const metadata = { title: "Homepage layout | Admin" };

export default async function AdminHomepageLayoutPage() {
  await requireStaff("/admin/homepage");
  const supabase = getSupabaseServiceRoleClient();
  let layoutPayload = await getHomePagePayload();
  try {
    const migrated = await migrateLegacyPromoBannersIfNeeded(supabase, layoutPayload);
    if (migrated !== layoutPayload) {
      clearCache(HOMEPAGE_BUNDLE_CACHE_KEY);
    }
    layoutPayload = migrated;
  } catch (e) {
    console.error("[admin homepage migrate]", e);
  }

  const [catalogProducts, configMeta, bannerQuery] = await Promise.all([
    (supabase.from("Product") as any)
      .select("id,name,slug,category")
      .order("name", { ascending: true }),
    (supabase.from("HomePageConfig") as any)
      .select("updatedAt")
      .eq("id", "default")
      .maybeSingle(),
    (supabase.from("HomePageBanner") as any)
      .select("*")
      .order("sortOrder", { ascending: true })
      .order("id", { ascending: true })
  ]);
  if (catalogProducts.error) throw new Error(catalogProducts.error.message);
  if (configMeta.error) throw new Error(configMeta.error.message);
  if (bannerQuery.error) throw new Error(bannerQuery.error.message);

  const bannerRows = (bannerQuery.data ?? []) as HomePageBannerRow[];
  /** Include image URLs so the editor remounts after banner-only saves (not only `HomePageConfig` updates). */
  const bannerFingerprint =
    bannerRows
      .map(
        (r) =>
          `${r.id}:${r.desktopImageUrl ?? ""}:${r.mobileImageUrl ?? ""}:${r.updatedAt ?? ""}`
      )
      .join("|") || "none";
  const editorKey = `${configMeta.data?.updatedAt ? new Date(configMeta.data.updatedAt).toISOString() : "default"}|${bannerFingerprint}`;

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-zinc-900">Homepage sections</h2>
        <p className="mt-1 max-w-2xl break-words text-sm leading-relaxed text-zinc-600">
          Build the storefront home from dynamic sections: each block has a title, layout (carousel or grid), and a
          hand-picked product list. Hero imagery is still managed under <strong>Homepage hero</strong>; use the toggle
          below to show or hide it on the home page.
        </p>
      </div>
      <HomePageEditorClient
        key={editorKey}
        initial={layoutPayload}
        catalogProducts={catalogProducts.data ?? []}
        initialBanners={bannerRows}
      />
    </div>
  );
}
