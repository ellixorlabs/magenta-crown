import { randomId } from "@/lib/random-id";
import type { DynamicProductSection, HomePagePayloadV1, HomePagePayloadV2 } from "@/lib/home-page-types";

/**
 * One-time migration from legacy v1 JSON to v2 (dynamic product sections).
 * Product rails in v1 did not store IDs — migrated sections keep titles/eyebrows but start with empty productIds.
 */
export function migrateHomePageV1ToV2(v1: HomePagePayloadV1): HomePagePayloadV2 {
  const heroSec = v1.sections.find((s) => s.type === "hero");
  const heroEnabled = !!(heroSec && heroSec.type === "hero" && heroSec.enabled);

  const sections: DynamicProductSection[] = [];
  let order = 0;

  for (const s of v1.sections) {
    if (!s.enabled) continue;
    if (s.type === "newArrivals" || s.type === "bestsellers" || s.type === "sareeCarousel") {
      const eyebrow = "eyebrow" in s ? s.eyebrow : "";
      const title = "title" in s ? s.title : s.type;
      const viewAllHref =
        s.type === "sareeCarousel"
          ? "/shop?category=Sarees"
          : s.type === "newArrivals"
            ? "/shop?sort=new"
            : "/shop";
      sections.push({
        id: `migrated-${s.id}-${randomId()}`,
        title,
        eyebrow,
        type: "carousel",
        enabled: true,
        order: order++,
        productIds: [],
        transition: s.transition,
        viewAllHref
      });
    }
  }

  if (sections.length === 0) {
    sections.push({
      id: `section-${randomId()}`,
      title: "Curated for you",
      eyebrow: "Shop",
      type: "carousel",
      enabled: false,
      order: 0,
      productIds: [],
      transition: "fade",
      viewAllHref: "/shop"
    });
  }

  return { version: 2, hero: { enabled: heroEnabled }, sections };
}
