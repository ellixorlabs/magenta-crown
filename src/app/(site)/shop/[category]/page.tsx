import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMergedShopSearchParams, parseShopSearchParams, stripKeysFromSearchParams } from "@/lib/shop-query";
import { categoryLabelFromSlug, shopCategoryHref } from "@/lib/shop-category-url";
import { getShopFilterOptionsCached } from "@/lib/site/shop-filter-options-cache";
import { ShopCatalogMain } from "@/app/(site)/shop/ShopCatalogMain";
import type { NextAppPageProps } from "@/types/next-app";

export const revalidate = 60;

type PageProps = NextAppPageProps<{ category: string }, Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const opts = await getShopFilterOptionsCached();
  const label = categoryLabelFromSlug(categorySlug, opts.categories);
  if (!label) {
    return { title: "Shop | Magenta Crown", robots: { index: false, follow: true } };
  }
  const path = `/shop/${categorySlug}`;
  return {
    title: `${label} | Shop | Magenta Crown`,
    description: `Browse ${label} — curated luxury occasionwear, filters, and fast checkout at Magenta Crown.`,
    alternates: { canonical: path },
    openGraph: { title: `${label} | Magenta Crown`, url: path }
  };
}

export default async function ShopCategoryPage({ params, searchParams }: PageProps) {
  const { category: categorySlug } = await params;
  const sp = await searchParams;
  const filterOptions = await getShopFilterOptionsCached();
  const label = categoryLabelFromSlug(categorySlug, filterOptions.categories);
  if (!label) notFound();

  const merged = buildMergedShopSearchParams(sp, filterOptions.categories, { categorySlug });
  const urlSp = stripKeysFromSearchParams(merged, ["category"]);
  const basePath = shopCategoryHref(label);
  const parsed = parseShopSearchParams(merged);

  const rawSort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort)?.trim().toLowerCase() ?? "";
  const heading =
    rawSort === "price_desc" || parsed.sort === "price-desc"
      ? `${label} — trending`
      : rawSort === "new" || parsed.sort === "new"
        ? `${label} — new arrivals`
        : rawSort === "price_asc" || parsed.sort === "price-asc"
          ? `${label} — value picks`
          : label;

  return (
    <ShopCatalogMain
      filterOptions={filterOptions}
      mergedSearchParams={merged}
      urlSearchParams={urlSp}
      basePath={basePath}
      heading={heading}
      emptyResetHref={basePath}
      emptyPrimaryLabel="Reset filters"
      pathLock={{
        omitUrlFilterKeys: ["category"],
        hideCategoryFilter: true
      }}
    />
  );
}
