import type { HeaderNavLinkRow } from "@/lib/db/app-types";
import { shopCategoryHref } from "@/lib/shop-category-url";

/** Used when the database has no active header links yet */
export const FALLBACK_PRIMARY: Pick<HeaderNavLinkRow, "label" | "href" | "group">[] = [
  { label: "New arrivals", href: "/shop?sort=new", group: null },
  { label: "Shop all", href: "/shop", group: null }
];

export const FALLBACK_MEGA: Record<string, { label: string; href: string }[]> = {
  Occasions: [
    { label: "Wedding Edit", href: "/shop?occasion=Wedding" },
    { label: "Festive Glow", href: "/shop?occasion=Festive" },
    { label: "Brunch Stories", href: "/shop" },
    { label: "Evening Luxe", href: "/shop" }
  ],
  Collections: [
    { label: "Sarees", href: shopCategoryHref("Sarees") },
    { label: "Lehengas", href: shopCategoryHref("Lehengas") },
    { label: "Anarkalis", href: shopCategoryHref("Anarkalis") },
    { label: "Co-ord Sets", href: "/shop" }
  ],
  "Designer Picks": [
    { label: "Trending Now", href: "/shop?sort=price_desc" },
    { label: "Bestsellers", href: "/shop" },
    { label: "Limited Editions", href: "/shop" },
    { label: "Gift Cards", href: "/shop" }
  ]
};
