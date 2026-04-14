import type { Product } from "@prisma/client";
import { auth } from "@/auth";
import { HomePageView } from "@/components/home/HomePageView";
import { prisma } from "@/lib/prisma";
import { getHeroCarouselSettings, getHeroSlidesForSite } from "@/lib/hero-data";
import { getHomePagePayload } from "@/lib/get-home-page-config";

async function loadHomeProducts(): Promise<Product[]> {
  try {
    return await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 48,
      include: { variants: { select: { quantity: true } } }
    });
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[HomePage] Database unreachable — product rails will be empty until the DB is available.");
    }
    return [];
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

  const [payload, heroSlides, products, heroCarousel] = await Promise.all([
    getHomePagePayload(),
    getHeroSlidesForSite(),
    loadHomeProducts(),
    getHeroCarouselSettings()
  ]);

  return (
    <HomePageView
      payload={payload}
      heroSlides={heroSlides}
      heroTransition={heroCarousel.transition}
      wishlistIds={wishlistIds}
      products={products}
    />
  );
}
