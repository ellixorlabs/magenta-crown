import type { HeaderNavLink } from "@prisma/client";

/** Used when the database has no active header links yet */
export const FALLBACK_PRIMARY: Pick<HeaderNavLink, "label" | "href" | "group">[] = [
  { label: "New arrivals", href: "/shop?sort=new", group: null },
  { label: "Shop all", href: "/shop", group: null },
  { label: "Sarees", href: "/shop?category=Sarees", group: null },
  { label: "Kurtas", href: "/shop?category=Kurtas", group: null }
];

export const FALLBACK_MEGA: Record<string, { label: string; href: string }[]> = {
  Occasions: [
    { label: "Wedding Edit", href: "/shop?occasion=Wedding" },
    { label: "Festive Glow", href: "/shop?occasion=Festive" },
    { label: "Brunch Stories", href: "/shop" },
    { label: "Evening Luxe", href: "/shop" }
  ],
  Collections: [
    { label: "Sarees", href: "/shop?category=Sarees" },
    { label: "Lehengas", href: "/shop?category=Lehengas" },
    { label: "Anarkalis", href: "/shop?category=Anarkalis" },
    { label: "Co-ord Sets", href: "/shop" }
  ],
  "Designer Picks": [
    { label: "New Arrivals", href: "/shop?sort=new" },
    { label: "Bestsellers", href: "/shop" },
    { label: "Limited Editions", href: "/shop" },
    { label: "Gift Cards", href: "/shop" }
  ]
};
