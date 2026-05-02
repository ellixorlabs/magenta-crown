import { LandingHero } from "@/components/features/LandingHero";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HomeCategoryCirclesSection } from "@/components/home/HomeCategoryCirclesSection";
import { HomeHeroReadyBridge } from "@/components/home/HomeHeroReadyBridge";
import { HomeProductCarouselSection } from "@/components/home/HomeProductCarouselSection";
import { HomeProductGridSection } from "@/components/home/HomeProductGridSection";
import { HomePromoBannerSection } from "@/components/home/HomePromoBannerSection";
import { SectionReveal } from "@/components/motion/SectionReveal";
import type { ProductRow } from "@/lib/db/app-types";
import type { HeroTransitionId } from "@/lib/hero-transition";
import type { HeroSlideVM } from "@/lib/hero-public";
import type { DynamicHomeSection, DynamicProductSection, HomePagePayloadV2 } from "@/lib/home-page-types";

type HomeProductRow = ProductRow & { variants?: { stock: number; isActive: boolean }[] };

type Props = {
  payload: HomePagePayloadV2;
  heroSlides: HeroSlideVM[];
  heroTransition: HeroTransitionId;
  wishlistIds: Set<string>;
  /** Products referenced by homepage section IDs (includes variants for stock). */
  productById: Map<string, HomeProductRow>;
};

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

export function HomePageView({ payload, heroSlides, heroTransition, wishlistIds, productById }: Props) {
  const hasHero = payload.hero.enabled;

  const sortedSections = [...payload.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

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

      {sortedSections.map((section: DynamicHomeSection) => {
        if (section.type === "promoBanner") {
          return (
            <SectionReveal key={section.id} transition={section.transition}>
              <HomePromoBannerSection
                title={section.title}
                subtitle={section.subtitle}
                imageUrl={section.imageUrl}
                targetHref={section.targetHref}
                gradientFrom={section.gradientFrom}
                gradientTo={section.gradientTo}
              />
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
              <section className="bg-[#faf7f8] py-14 sm:py-16">
                <div className="section-shell">
                  <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{section.eyebrow}</p>
                  <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl">
                    <Link href={viewAll} className="inline-flex items-center gap-2 hover:text-crown-900">
                      <span>{section.title}</span>
                      <span
                        aria-hidden
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600"
                      >
                        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                    </Link>
                  </h2>
                  <div className="mt-8 rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
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
                eyebrow={section.eyebrow}
                title={section.title}
                products={products}
                wishlistIds={wishlistIds}
                viewAllHref={viewAll}
                emptyMessage="No products in this section."
              />
            </SectionReveal>
          );
        }

        return (
          <SectionReveal key={section.id} transition={section.transition}>
            <HomeProductCarouselSection
              eyebrow={section.eyebrow}
              title={section.title}
              products={products}
              wishlistIds={wishlistIds}
              viewAllHref={viewAll}
              emptyMessage="No products in this section."
            />
          </SectionReveal>
        );
      })}
    </main>
  );
}
