import type { Metadata } from "next";
import type { Product } from "@prisma/client";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Home",
  description:
    "Luxury women's occasionwear — new arrivals, curated edits, and seasonal collections. Discover sarees, lehengas, and more at Magenta Crown."
};
import { HomePageView } from "@/components/home/HomePageView";
import { prisma } from "@/lib/prisma";
import { DEFAULT_HERO_SLIDES, getHeroCarouselSettings, getHeroSlidesForSite } from "@/lib/hero-data";
import { getHomePagePayload } from "@/lib/get-home-page-config";

type ProductRow = Product & { variants?: { stock: number; isActive: boolean }[] };

async function loadProductsByIds(ids: string[]): Promise<Map<string, ProductRow>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  try {
    const rows = await prisma.product.findMany({
      where: { id: { in: unique } },
      include: { variants: { select: { stock: true, isActive: true } } }
    });
    return new Map(rows.map((p) => [p.id, p]));
  } catch {
    return new Map();
  }
}

export default async function HomePage() {
  const session = await auth();
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

  const [payload, heroSlides, heroCarousel] = await Promise.all([
    getHomePagePayload(),
    getHeroSlidesForSite(),
    getHeroCarouselSettings()
  ]);

  const allIds = payload.sections.flatMap((s) => s.productIds);
  const productById = await loadProductsByIds(allIds);

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
