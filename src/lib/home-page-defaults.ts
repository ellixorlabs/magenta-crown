import type { HomePagePayloadV1 } from "./home-page-types";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1200&q=80";

export function createDefaultHomePagePayload(): HomePagePayloadV1 {
  return {
    version: 1,
    sections: [
      {
        id: "hero",
        type: "hero",
        enabled: true,
        transition: "none",
        carousel: "fade"
      },
      {
        id: "categories",
        type: "categoryGrid",
        enabled: true,
        transition: "fade",
        eyebrow: "Featured categories",
        title: "Shop by occasion",
        items: [
          {
            title: "Wedding",
            href: "/shop?occasion=Wedding",
            imageUrl:
              "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=900&q=80"
          },
          {
            title: "Festive",
            href: "/shop?occasion=Festive",
            imageUrl:
              "https://images.unsplash.com/photo-1604147495798-57beb5d6af73?auto=format&fit=crop&w=900&q=80"
          },
          {
            title: "Casual",
            href: "/shop?occasion=Casual",
            imageUrl:
              "https://images.unsplash.com/photo-1617331721458-bd3bd3f9c7f8?auto=format&fit=crop&w=900&q=80"
          }
        ]
      },
      {
        id: "prices",
        type: "priceShop",
        enabled: true,
        transition: "fade",
        eyebrow: "Shop by price",
        title: "Find your range",
        buckets: [
          { label: "Under ₹10,000", minPrice: 0, maxPrice: 10000 },
          { label: "₹10,000 – ₹25,000", minPrice: 10000, maxPrice: 25000 },
          { label: "Above ₹25,000", minPrice: 25000 }
        ]
      },
      {
        id: "newArrivals",
        type: "newArrivals",
        enabled: true,
        transition: "fade",
        eyebrow: "New arrivals",
        title: "Fresh from the atelier",
        count: 4
      },
      {
        id: "bestsellers",
        type: "bestsellers",
        enabled: true,
        transition: "fade",
        eyebrow: "Bestsellers",
        title: "Most loved right now",
        count: 8
      },
      {
        id: "story",
        type: "productStory",
        enabled: true,
        transition: "fade",
        imageUrl: PLACEHOLDER,
        imageAlt: "Hand embroidery detail",
        eyebrow: "Product story",
        title: "Threads of intention",
        body:
          "Each silhouette begins with hand-selected textiles and couture finishing. From the first drape to the final stitch, every Magenta Crown piece is composed for women who carry heritage with a modern pulse.",
        bullets: [
          "Artisan embroidery and zardozi accents",
          "Breathable linings and structured silhouettes",
          "Limited small-batch production"
        ],
        ctaLabel: "Read our craftsmanship story",
        ctaHref: "/about"
      },
      {
        id: "ethos",
        type: "brandEthos",
        enabled: true,
        transition: "fade",
        columns: [
          {
            label: "Vision",
            body: "To celebrate the woman who moves between worlds—rooted in tradition, fluent in the future."
          },
          {
            label: "Mission",
            body: "To deliver couture-grade occasionwear with transparent sourcing, ethical ateliers, and uncompromising fit."
          },
          {
            label: "Values",
            body: "Craftsmanship, dignity, and slow fashion. We invest in artisans, not excess inventory."
          }
        ]
      },
      {
        id: "testimonials",
        type: "testimonials",
        enabled: true,
        transition: "fade",
        eyebrow: "Testimonials",
        title: "Loved by women who dress for the moment",
        quotes: [
          {
            name: "Aisha K.",
            text: "The drape and finish felt like couture without the wait. My wedding reception look was unforgettable."
          },
          {
            name: "Meera S.",
            text: "Impeccable fabrics and true-to-size tailoring. The team helped me style the full look."
          },
          {
            name: "Priya R.",
            text: "Luxury that feels personal. The packaging and detail rivaled the boutiques I visited abroad."
          }
        ]
      },
      {
        id: "social",
        type: "socialGallery",
        enabled: true,
        transition: "fade",
        eyebrow: "Instagram",
        title: "@magentacrown",
        subtitle: "Tag us in your celebration moments.",
        images: [
          "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1604147495798-57beb5d6af73?auto=format&fit=crop&w=600&q=80",
          "https://images.unsplash.com/photo-1617331721458-bd3bd3f9c7f8?auto=format&fit=crop&w=600&q=80"
        ]
      },
      {
        id: "newsletter",
        type: "newsletter",
        enabled: true,
        transition: "fade",
        eyebrow: "Newsletter",
        title: "Private previews & new drops",
        subtitle:
          "Join the list for early access to collections, styling sessions, and invitation-only events."
      }
    ]
  };
}
