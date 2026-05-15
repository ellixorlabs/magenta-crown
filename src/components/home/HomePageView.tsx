import { LandingHero } from "@/components/features/LandingHero";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { HomeCategoryCirclesSection } from "@/components/home/HomeCategoryCirclesSection";
import { HomeHeroReadyBridge } from "@/components/home/HomeHeroReadyBridge";
import { HomeProductGridSection } from "@/components/home/HomeProductGridSection";
import { SectionReveal } from "@/components/motion/SectionReveal";
import type { ProductRow } from "@/lib/db/app-types";
import type { HeroTransitionId } from "@/lib/hero-transition";
import type { HeroSlideVM } from "@/lib/hero-public";
import type { DynamicHomeSection, DynamicProductSection, HomePagePayloadV2 } from "@/lib/home-page-types";
import { resolveHomePageBanners, type HomePageBannerRow } from "@/lib/home-page-banner";

type HomeProductRow = ProductRow & { variants?: { stock: number; isActive: boolean }[] };

type Props = {
  payload: HomePagePayloadV2;
  heroSlides: HeroSlideVM[];
  heroTransition: HeroTransitionId;
  wishlistIds: Set<string>;
  /** Products referenced by homepage section IDs (includes variants for stock). */
  productById: Map<string, HomeProductRow>;
  homePageBanners: HomePageBannerRow[];
};

const HomeProductCarouselSection = dynamic(
  () => import("@/components/home/HomeProductCarouselSection").then((m) => m.HomeProductCarouselSection),
  { loading: () => null }
);

const HomePromoBannerCarouselSection = dynamic(
  () => import("@/components/home/HomePromoBannerCarouselSection").then((m) => m.HomePromoBannerCarouselSection),
  { loading: () => null }
);

function resolveSectionProducts(section: DynamicProductSection, productById: Map<string, HomeProductRow>): HomeProductRow[] {
  const out: HomeProductRow[] = [];
  const seen = new Set<string>();
  for (const id of section.productIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const p = productById.get(id);
    if (p) out.push(p);
  }
  return out;
}

export function HomePageView({ payload, heroSlides, heroTransition, wishlistIds, productById, homePageBanners }: Props) {
  const hasHero = payload.hero.enabled;

  const sortedSections = [...payload.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const bannerDisplays = resolveHomePageBanners(homePageBanners, payload);
  const firstBannerSlotIndex = sortedSections.findIndex(
    (s) => s.type === "bannerCarousel" || s.type === "promoBanner"
  );

  return (
    <main className="bg-transparent">
      <HomeHeroReadyBridge hasHero={hasHero} />
      {hasHero && <LandingHero slides={heroSlides} transition={heroTransition} />}
      {payload.categoryCircles.enabled && payload.categoryCircles.items.length > 0 ? (
        <SectionReveal transition="fade">
          <HomeCategoryCirclesSection
            eyebrow={payload.categoryCircles.eyebrow}
            title={payload.categoryCircles.title}
            shape={payload.categoryCircles.shape}
            items={payload.categoryCircles.items}
          />
        </SectionReveal>
      ) : null}

      {sortedSections.map((section: DynamicHomeSection, index) => {
        if (section.type === "bannerCarousel" || section.type === "promoBanner") {
          if (index !== firstBannerSlotIndex) return null;
          if (bannerDisplays.length === 0) return null;
          return (
            <SectionReveal key={`home-banners-${section.id}`} transition={section.transition}>
              <HomePromoBannerCarouselSection banners={bannerDisplays} />
            </SectionReveal>
          );
        }

        const products = resolveSectionProducts(section, productById);
        const viewAll = (section.viewAllHref?.trim() || "/shop").replace(/\s/g, "");

        if (section.productIds.length === 0) {
          return null;
        }

        if (products.length === 0) {
          return (
            <SectionReveal key={section.id} transition={section.transition}>
              <section className="overflow-x-clip bg-mc-cream py-8 sm:py-11 lg:py-10">
                <div className="section-shell max-w-full min-w-0">
                  <div className="flex flex-col gap-2">
                  <h2 className="font-mc-heading text-xl font-semibold text-mc-ink sm:text-2xl">
                    <Link href={viewAll} className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 hover:text-mc-maroon">
                      <span className="min-w-0 break-words">{section.title}</span>
                      <span
                        aria-hidden
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-mc-ink/15 bg-white text-mc-ink/60"
                      >
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                    </Link>
                  </h2>
                  </div>
                  <div className="mt-6 rounded-3xl border border-dashed border-mc-ink/20 bg-mc-creamDeep/80 p-10 text-center text-mc-muted">
                    Some products in this section are no longer available. Update the section in admin.
                  </div>
                </div>
              </section>
            </SectionReveal>
          );
        }

        if (section.type === "grid") {
          return (
            <SectionReveal key={section.id} transition={section.transition}>
              <HomeProductGridSection
                title={section.title}
                products={products}
                wishlistIds={wishlistIds}
                viewAllHref={viewAll}
                emptyMessage="No products in this section."
                cardDensity="compact"
              />
            </SectionReveal>
          );
        }

        return (
          <SectionReveal key={section.id} transition={section.transition}>
            <HomeProductCarouselSection
              title={section.title}
              products={products}
              wishlistIds={wishlistIds}
              viewAllHref={viewAll}
              emptyMessage="No products in this section."
              cardDensity="compact"
            />
          </SectionReveal>
        );
      })}
    </main>
  );
}
