import { randomId } from "@/lib/random-id";
import type { DynamicProductSection, HomePagePayloadV1, HomePagePayloadV2 } from "@/lib/home-page-types";
import { shopCategoryHref } from "@/lib/shop-category-url";

/**
 * One-time migration from legacy v1 JSON to v2 (dynamic product sections).
 * Product rails in v1 did not store IDs — migrated sections keep titles/eyebrows but start with empty productIds.
 */
export function migrateHomePageV1ToV2(v1: HomePagePayloadV1): HomePagePayloadV2 {
  const heroSec = v1.sections.find((s) => s.type === "hero");
  const heroEnabled = !!(heroSec && heroSec.type === "hero" && heroSec.enabled);
  const categoryGrid = v1.sections.find((s) => s.type === "categoryGrid");

  const sections: DynamicProductSection[] = [];
  let order = 0;

  for (const s of v1.sections) {
    if (!s.enabled) continue;
    if (s.type === "newArrivals" || s.type === "bestsellers" || s.type === "sareeCarousel") {
      const rail = s;
      const eyebrow = rail.eyebrow;
      const title = rail.title;
      const viewAllHref =
        rail.type === "sareeCarousel"
          ? shopCategoryHref("Sarees")
          : rail.type === "newArrivals"
            ? "/shop?sort=new"
            : "/shop";
      sections.push({
        id: `migrated-${rail.id}-${randomId()}`,
        title,
        eyebrow,
        type: "carousel",
        enabled: true,
        order: order++,
        productIds: [],
        transition: rail.transition,
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

  return {
    version: 2,
    hero: { enabled: heroEnabled },
    categoryCircles: {
      enabled: !!categoryGrid?.enabled,
      eyebrow: categoryGrid?.type === "categoryGrid" ? categoryGrid.eyebrow : "Shop by category",
      title: categoryGrid?.type === "categoryGrid" ? categoryGrid.title : "Explore collections",
      shape: "circle",
      items:
        categoryGrid?.type === "categoryGrid"
          ? categoryGrid.items.slice(0, 8).map((item) => ({
              id: `circle-${randomId()}`,
              label: item.title,
              imageUrl: item.imageUrl,
              targetType: "customUrl" as const,
              targetValue: item.href
            }))
          : []
    },
    sections
  };
}
