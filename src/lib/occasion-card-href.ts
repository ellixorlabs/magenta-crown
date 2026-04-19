import type { CategoryItem } from "@/lib/home-page-types";

/** Shop filter uses `occasion` query; optional `occasion` on cards wins over raw href. */
export function occasionCardHref(item: CategoryItem): string {
  const tag = item.occasion?.trim();
  if (tag) return `/shop?occasion=${encodeURIComponent(tag)}`;
  return item.href || "/shop";
}
