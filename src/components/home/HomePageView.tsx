import type { Product } from "@prisma/client";
import { LandingHero } from "@/components/features/LandingHero";
import { CategoryGrid } from "@/components/features/CategoryGrid";
import { BrandEthosSection } from "@/components/home/BrandEthosSection";
import { HomeProductGridSection } from "@/components/home/HomeProductGridSection";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { PriceShopSection } from "@/components/home/PriceShopSection";
import { ProductStorySection } from "@/components/home/ProductStorySection";
import { SocialGallerySection } from "@/components/home/SocialGallerySection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { SectionReveal } from "@/components/motion/SectionReveal";
import type { HeroTransitionId } from "@/lib/hero-transition";
import type { HeroSlideVM } from "@/lib/hero-data";
import type { HomePagePayloadV1 } from "@/lib/home-page-types";

type Props = {
  payload: HomePagePayloadV1;
  heroSlides: HeroSlideVM[];
  heroTransition: HeroTransitionId;
  wishlistIds: Set<string>;
  /** Newest-first; product rails consume sequentially in section order */
  products: Product[];
};

export function HomePageView({ payload, heroSlides, heroTransition, wishlistIds, products }: Props) {
  let railCursor = 0;

  const takeRail = (count: number) => {
    const slice = products.slice(railCursor, railCursor + count);
    railCursor += count;
    return slice;
  };

  const heroCfg = payload.sections.find((s) => s.type === "hero" && s.enabled);

  return (
    <main className="bg-transparent">
      {heroCfg && heroCfg.type === "hero" && (
        <LandingHero slides={heroSlides} transition={heroTransition} />
      )}

      {payload.sections.map((section) => {
        if (!section.enabled || section.type === "hero") return null;

        switch (section.type) {
          case "categoryGrid":
            return (
              <SectionReveal key={section.id} transition={section.transition}>
                <CategoryGrid eyebrow={section.eyebrow} title={section.title} items={section.items} />
              </SectionReveal>
            );
          case "priceShop":
            return (
              <SectionReveal key={section.id} transition={section.transition}>
                <PriceShopSection eyebrow={section.eyebrow} title={section.title} buckets={section.buckets} />
              </SectionReveal>
            );
          case "newArrivals":
            return (
              <SectionReveal key={section.id} transition={section.transition}>
                <HomeProductGridSection
                  eyebrow={section.eyebrow}
                  title={section.title}
                  products={takeRail(section.count)}
                  wishlistIds={wishlistIds}
                  viewAllHref="/shop?sort=new"
                />
              </SectionReveal>
            );
          case "bestsellers":
            return (
              <SectionReveal key={section.id} transition={section.transition}>
                <HomeProductGridSection
                  eyebrow={section.eyebrow}
                  title={section.title}
                  products={takeRail(section.count)}
                  wishlistIds={wishlistIds}
                  viewAllHref="/shop"
                />
              </SectionReveal>
            );
          case "productStory":
            return (
              <SectionReveal key={section.id} transition={section.transition}>
                <ProductStorySection
                  imageUrl={section.imageUrl}
                  imageAlt={section.imageAlt}
                  eyebrow={section.eyebrow}
                  title={section.title}
                  body={section.body}
                  bullets={section.bullets}
                  ctaLabel={section.ctaLabel}
                  ctaHref={section.ctaHref}
                />
              </SectionReveal>
            );
          case "brandEthos":
            return (
              <SectionReveal key={section.id} transition={section.transition}>
                <BrandEthosSection columns={section.columns} />
              </SectionReveal>
            );
          case "testimonials":
            return (
              <SectionReveal key={section.id} transition={section.transition}>
                <TestimonialsSection eyebrow={section.eyebrow} title={section.title} quotes={section.quotes} />
              </SectionReveal>
            );
          case "socialGallery":
            return (
              <SectionReveal key={section.id} transition={section.transition}>
                <SocialGallerySection
                  eyebrow={section.eyebrow}
                  title={section.title}
                  subtitle={section.subtitle}
                  images={section.images}
                />
              </SectionReveal>
            );
          case "newsletter":
            return (
              <SectionReveal key={section.id} transition={section.transition}>
                <NewsletterSection eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
              </SectionReveal>
            );
          default:
            return null;
        }
      })}
    </main>
  );
}
