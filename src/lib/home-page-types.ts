/** Homepage layout config (stored in HomePageConfig.payload, versioned in code). */

export type SectionTransition = "fade" | "slide" | "zoom" | "none";

export type HeroCarouselMode = "fade" | "slide";

export type BaseSection = {
  id: string;
  enabled: boolean;
  transition: SectionTransition;
};

export type HeroSectionConfig = BaseSection & {
  type: "hero";
  carousel: HeroCarouselMode;
};

export type CategoryItem = { title: string; href: string; imageUrl: string };

export type CategoryGridSectionConfig = BaseSection & {
  type: "categoryGrid";
  eyebrow: string;
  title: string;
  items: CategoryItem[];
};

export type PriceBucket = {
  label: string;
  minPrice?: number;
  maxPrice?: number;
};

export type PriceShopSectionConfig = BaseSection & {
  type: "priceShop";
  eyebrow: string;
  title: string;
  buckets: PriceBucket[];
};

export type ProductRailSectionConfig = BaseSection & {
  type: "newArrivals" | "bestsellers";
  eyebrow: string;
  title: string;
  count: number;
};

export type ProductStorySectionConfig = BaseSection & {
  type: "productStory";
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

export type BrandEthosColumn = { label: string; body: string };

export type BrandEthosSectionConfig = BaseSection & {
  type: "brandEthos";
  columns: BrandEthosColumn[];
};

export type TestimonialQuote = { name: string; text: string };

export type TestimonialsSectionConfig = BaseSection & {
  type: "testimonials";
  eyebrow: string;
  title: string;
  quotes: TestimonialQuote[];
};

export type SocialGallerySectionConfig = BaseSection & {
  type: "socialGallery";
  eyebrow: string;
  title: string;
  subtitle: string;
  images: string[];
};

export type NewsletterSectionConfig = BaseSection & {
  type: "newsletter";
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type HomeSectionConfig =
  | HeroSectionConfig
  | CategoryGridSectionConfig
  | PriceShopSectionConfig
  | ProductRailSectionConfig
  | ProductStorySectionConfig
  | BrandEthosSectionConfig
  | TestimonialsSectionConfig
  | SocialGallerySectionConfig
  | NewsletterSectionConfig;

export type HomePagePayloadV1 = {
  version: 1;
  sections: HomeSectionConfig[];
};
