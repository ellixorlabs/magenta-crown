import type { Metadata } from "next";
import { auth } from "@/auth";
import { isStorefrontStaff } from "@/lib/admin-permissions";
import { HomePageView } from "@/components/home/HomePageView";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { getHomePageDbBundle } from "@/lib/site/load-home-bundle";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Luxury women's occasionwear — new arrivals, curated edits, and seasonal collections. Discover sarees, lehengas, and more at Magenta Crown."
};

export default async function HomePage() {
  const [session, bundle] = await Promise.all([auth(), getHomePageDbBundle()]);

  let wishlistIds = new Set<string>();
  if (session?.user?.id && !isStorefrontStaff(session.user.role)) {
    try {
      const supabase = getSupabaseServiceRoleClient();
      const { data: links, error } = await (supabase.from("_UserWishlist") as any)
        .select("A")
        .eq("B", session.user.id);
      if (error) throw new Error(error.message);
      wishlistIds = new Set(((links ?? []) as Array<{ A: string }>).map((w) => w.A));
    } catch {
      /* offline DB — show page without wishlist state */
    }
  }

  const { payload, heroSlides, heroCarousel, productById, homePageBanners } = bundle;

  return (
    <>
      <HomePageView
        payload={payload}
        heroSlides={heroSlides}
        heroTransition={heroCarousel.transition}
        wishlistIds={wishlistIds}
        productById={productById}
        homePageBanners={homePageBanners}
      />
    </>
  );
}
