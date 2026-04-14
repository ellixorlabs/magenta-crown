import type { HomeSectionConfig } from "./home-page-types";

const base = (id: string) => ({
  id,
  enabled: true,
  transition: "fade" as const
});

/** New section block for “Add section” in admin (merge into payload.sections). */
export function templateSection(type: HomeSectionConfig["type"], id: string): HomeSectionConfig {
  const b = base(id);
  switch (type) {
    case "hero":
      return { ...b, type: "hero", carousel: "fade" };
    case "categoryGrid":
      return {
        ...b,
        type: "categoryGrid",
        eyebrow: "Featured categories",
        title: "Shop by occasion",
        items: [
          {
            title: "Wedding",
            href: "/shop?occasion=Wedding",
            imageUrl:
              "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=900&q=80"
          }
        ]
      };
    case "priceShop":
      return {
        ...b,
        type: "priceShop",
        eyebrow: "Shop by price",
        title: "Find your range",
        buckets: [{ label: "Example range", minPrice: 0, maxPrice: 15000 }]
      };
    case "newArrivals":
      return { ...b, type: "newArrivals", eyebrow: "New arrivals", title: "Fresh from the atelier", count: 4 };
    case "bestsellers":
      return { ...b, type: "bestsellers", eyebrow: "Bestsellers", title: "Most loved right now", count: 8 };
    case "productStory":
      return {
        ...b,
        type: "productStory",
        imageUrl:
          "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1000&q=80",
        imageAlt: "Story",
        eyebrow: "Product story",
        title: "Your title",
        body: "Supporting copy.",
        bullets: ["Point one", "Point two"],
        ctaLabel: "Learn more",
        ctaHref: "/about"
      };
    case "brandEthos":
      return {
        ...b,
        type: "brandEthos",
        columns: [{ label: "Vision", body: "Your vision copy." }]
      };
    case "testimonials":
      return {
        ...b,
        type: "testimonials",
        eyebrow: "Testimonials",
        title: "Loved by our clients",
        quotes: [{ name: "Name", text: "Quote text." }]
      };
    case "socialGallery":
      return {
        ...b,
        type: "socialGallery",
        eyebrow: "Instagram",
        title: "@magentacrown",
        subtitle: "Tag us.",
        images: [
          "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=600&q=80"
        ]
      };
    case "newsletter":
      return {
        ...b,
        type: "newsletter",
        eyebrow: "Newsletter",
        title: "Stay in the loop",
        subtitle: "Email updates for new drops."
      };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export const SECTION_TYPE_LABELS: { type: HomeSectionConfig["type"]; label: string }[] = [
  { type: "hero", label: "Hero (carousel — uses Hero slides)" },
  { type: "categoryGrid", label: "Category grid" },
  { type: "priceShop", label: "Shop by price (boxes)" },
  { type: "newArrivals", label: "New arrivals (product rail)" },
  { type: "bestsellers", label: "Bestsellers (product rail)" },
  { type: "productStory", label: "Product story (image + copy)" },
  { type: "brandEthos", label: "Brand ethos (columns)" },
  { type: "testimonials", label: "Testimonials" },
  { type: "socialGallery", label: "Social / image grid" },
  { type: "newsletter", label: "Newsletter" }
];
