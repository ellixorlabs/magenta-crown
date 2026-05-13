import type { Metadata } from "next";
import { getShopFilterOptionsCached } from "@/lib/site/shop-filter-options-cache";
import { parseShopSearchParams } from "@/lib/shop-query";
import { ShopCatalogMain } from "@/app/(site)/shop/ShopCatalogMain";
import type { NextAppPageSearch } from "@/types/next-app";

/** Keep shop responsive while allowing short-lived cache reuse across quick navigations. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse sarees, lehengas, kurtas, and luxury occasionwear. Filter by category, occasion, size, material, and price at Magenta Crown.",
  alternates: { canonical: "/shop" }
};

type PageProps = NextAppPageSearch<Record<string, string | string[] | undefined>>;

export default async function ShopPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const parsed = parseShopSearchParams(sp);
  const filterOptions = await getShopFilterOptionsCached();

  const rawSort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort)?.trim().toLowerCase() ?? "";
  const selectedCategoryRaw = (Array.isArray(sp.category) ? sp.category[0] : sp.category)?.trim() ?? "";
  const selectedCategory = (() => {
    try {
      return decodeURIComponent(selectedCategoryRaw);
    } catch {
      return selectedCategoryRaw;
    }
  })();
  const heading =
    selectedCategory ||
    (rawSort === "price_desc" || parsed.sort === "price-desc"
      ? "Trending now"
      : rawSort === "new" || parsed.sort === "new"
        ? "New arrivals"
        : rawSort === "price_asc" || parsed.sort === "price-asc"
          ? "Value picks"
          : "All products");

  return (
    <ShopCatalogMain
      filterOptions={filterOptions}
      mergedSearchParams={sp}
      urlSearchParams={sp}
      basePath="/shop"
      heading={heading}
      emptyResetHref="/shop"
    />
  );
}
