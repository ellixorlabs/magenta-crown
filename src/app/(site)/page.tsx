import type { Metadata } from "next";
import { auth } from "@/auth";
import { HomePageView } from "@/components/home/HomePageView";
import { DEFAULT_HERO_SLIDES } from "@/lib/hero-public";
import { prisma } from "@/lib/prisma";
import { getHomePageDbBundle } from "@/lib/site/load-home-bundle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Home",
  description:
    "Luxury women's occasionwear — new arrivals, curated edits, and seasonal collections. Discover sarees, lehengas, and more at Magenta Crown."
};

export default async function HomePage() {
  const [session, bundle] = await Promise.all([auth(), getHomePageDbBundle()]);

  let wishlistIds = new Set<string>();
  if (
    session?.user?.id &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "SUB_ADMIN" &&
    session.user.role !== "TECH_SUPPORT"
  ) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { wishlist: { select: { id: true } } }
      });
      wishlistIds = new Set(u?.wishlist.map((w) => w.id) ?? []);
    } catch {
      /* offline DB — show page without wishlist state */
    }
  }

  const { payload, heroSlides, heroCarousel, productById } = bundle;

  const heroEnabled = payload.hero.enabled;
  const firstHeroBg =
    heroEnabled && (heroSlides.length ? heroSlides[0].bg : DEFAULT_HERO_SLIDES[0]?.bg);

  return (
    <>
      {firstHeroBg ? (
        <link rel="preload" as="image" href={firstHeroBg} fetchPriority="high" />
      ) : null}
      <HomePageView
        payload={payload}
        heroSlides={heroSlides}
        heroTransition={heroCarousel.transition}
        wishlistIds={wishlistIds}
        productById={productById}
      />
    </>
  );
}
