import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMergedShopSearchParams, parseShopSearchParams, stripKeysFromSearchParams } from "@/lib/shop-query";
import { categoryLabelFromSlug, categoryLabelToSlug, resolveSubSlugForCategory } from "@/lib/shop-category-url";
import { getShopFilterOptionsCached } from "@/lib/site/shop-filter-options-cache";
import { getDistinctProductFacetsForCategory } from "@/lib/site/shop-products-db";
import { ShopCatalogMain } from "@/app/(site)/shop/ShopCatalogMain";
import type { NextAppPageProps } from "@/types/next-app";

export const revalidate = 60;

type PageProps = NextAppPageProps<
  { category: string; subcategory: string },
  Record<string, string | string[] | undefined>
>;

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const { category: categorySlug, subcategory: subSlug } = await params;
  const opts = await getShopFilterOptionsCached();
  const label = categoryLabelFromSlug(categorySlug, opts.categories);
  if (!label) {
    return { title: "Shop | Magenta Crown", robots: { index: false, follow: true } };
  }
  const sub = await resolveSubSlugForCategory((field) => getDistinctProductFacetsForCategory(label, field), subSlug);
  if (!sub) {
    return { title: `${label} | Shop | Magenta Crown`, robots: { index: false, follow: true } };
  }
  const path = `/shop/${categorySlug}/${subSlug}`;
  const facetTitle = sub.field === "material" ? `${sub.value} ${label}` : `${sub.value} · ${label}`;
  return {
    title: `${facetTitle} | Magenta Crown`,
    description: `Shop ${sub.value} in ${label} — luxury edits, precise filters, and secure checkout at Magenta Crown.`,
    alternates: { canonical: path },
    openGraph: { title: `${facetTitle} | Magenta Crown`, url: path }
  };
}

export default async function ShopCategorySubPage({ params, searchParams }: PageProps) {
  const { category: categorySlug, subcategory: subSlug } = await params;
  const sp = await searchParams;
  const filterOptions = await getShopFilterOptionsCached();
  const label = categoryLabelFromSlug(categorySlug, filterOptions.categories);
  if (!label) notFound();

  const sub = await resolveSubSlugForCategory((field) => getDistinctProductFacetsForCategory(label, field), subSlug);
  if (!sub) notFound();

  const merged = buildMergedShopSearchParams(sp, filterOptions.categories, { categorySlug, sub });
  const omitKeys = ["category", sub.field] as const;
  const urlSp = stripKeysFromSearchParams(merged, omitKeys);
  const basePath = `/shop/${categoryLabelToSlug(label)}/${subSlug}`;
  const parsed = parseShopSearchParams(merged);

  const rawSort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort)?.trim().toLowerCase() ?? "";
  const facetBit = sub.field === "occasion" ? `${sub.value} occasions` : sub.field === "style" ? `${sub.value} styles` : sub.value;
  const heading =
    rawSort === "price_desc" || parsed.sort === "price-desc"
      ? `${label} — ${facetBit} (trending)`
      : rawSort === "new" || parsed.sort === "new"
        ? `${label} — ${facetBit} (new)`
        : rawSort === "price_asc" || parsed.sort === "price-asc"
          ? `${label} — ${facetBit} (value)`
          : `${label} — ${facetBit}`;

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
        omitUrlFilterKeys: [...omitKeys],
        hideCategoryFilter: true,
        hideFacetFields: [sub.field]
      }}
    />
  );
}
