import type { Product } from "@prisma/client";
import { LandingHero } from "@/components/features/LandingHero";
import { HomeHeroReadyBridge } from "@/components/home/HomeHeroReadyBridge";
import { HomeProductCarouselSection } from "@/components/home/HomeProductCarouselSection";
import { HomeProductGridSection } from "@/components/home/HomeProductGridSection";
import { SectionReveal } from "@/components/motion/SectionReveal";
import type { HeroTransitionId } from "@/lib/hero-transition";
import type { HeroSlideVM } from "@/lib/hero-data";
import type { DynamicProductSection, HomePagePayloadV2 } from "@/lib/home-page-types";

type ProductRow = Product & { variants?: { stock: number; isActive: boolean }[] };

type Props = {
  payload: HomePagePayloadV2;
  heroSlides: HeroSlideVM[];
  heroTransition: HeroTransitionId;
  wishlistIds: Set<string>;
  /** Products referenced by homepage section IDs (includes variants for stock). */
  productById: Map<string, ProductRow>;
};

function resolveSectionProducts(section: DynamicProductSection, productById: Map<string, ProductRow>): ProductRow[] {
  const out: ProductRow[] = [];
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

      {sortedSections.map((section) => {
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
                    {section.title}
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
