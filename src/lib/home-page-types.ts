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

export type CategoryItem = {
  title: string;
  href: string;
  imageUrl: string;
  /** When set, the card links to `/shop?occasion=…` (matches product `occasion` field). */
  occasion?: string;
};

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

/** Horizontal carousel of products in category “Sarees” (dedicated product query on the home page). */
export type SareeCarouselSectionConfig = BaseSection & {
  type: "sareeCarousel";
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
  | SareeCarouselSectionConfig
  | ProductStorySectionConfig
  | BrandEthosSectionConfig
  | TestimonialsSectionConfig
  | SocialGallerySectionConfig
  | NewsletterSectionConfig;

export type HomePagePayloadV1 = {
  version: 1;
  sections: HomeSectionConfig[];
};

/** Dynamic merchandising section (carousel or grid of hand-picked products). */
export type DynamicProductSection = {
  id: string;
  title: string;
  eyebrow: string;
  type: "carousel" | "grid";
  enabled: boolean;
  /** Sort key; lower renders first. */
  order: number;
  productIds: string[];
  transition: SectionTransition;
  /** “View all” link; defaults to /shop in the storefront if empty. */
  viewAllHref?: string;
};

/** Current homepage config: hero toggle + fully dynamic product sections (DB). */
export type HomePagePayloadV2 = {
  version: 2;
  /** Hero imagery still comes from HeroSlide admin; this only toggles visibility on the home page. */
  hero: { enabled: boolean };
  sections: DynamicProductSection[];
};

export type HomePagePayload = HomePagePayloadV2;
