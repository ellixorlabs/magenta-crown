"use client";

import type { ShopProductGridRow } from "@/lib/shop-product-grid-row";
import type { ProductRow } from "@/lib/db/app-types";
import { memo } from "react";
import { ProductCard } from "@/components/features/ProductCard";
import { ShopPagination } from "@/components/shop/ShopPagination";
import { SHOP_PRODUCT_GRID_DEFAULT_CLASS } from "@/components/skeletons/shop-grid";
import { getProductTotalStock } from "@/lib/variant-stock";
import type { ShopProductReviewSummary } from "@/lib/shop-product-reviews";

type Props = {
  basePath: string;
  urlSearchParams: Record<string, string | string[] | undefined>;
  products: ShopProductGridRow[];
  wishlistIds: Set<string>;
  pagination: { page: number; pageSize: number; total: number };
  reviewSummaryByProductId: Record<string, ShopProductReviewSummary | null>;
};

export const ShopCatalogProducts = memo(function ShopCatalogProducts({
  basePath,
  urlSearchParams,
  products,
  wishlistIds,
  pagination,
  reviewSummaryByProductId
}: Props) {
  return (
    <>
      <ShopPagination
        basePath={basePath}
        searchParams={urlSearchParams}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalCount={pagination.total}
      />

      <div className={SHOP_PRODUCT_GRID_DEFAULT_CLASS}>
        {products.map((p) => {
          const { reviews: _reviews, ...product } = p;
          return (
            <ProductCard
              key={product.id}
              product={product as unknown as ProductRow}
              initialWishlisted={wishlistIds.has(product.id)}
              outOfStock={getProductTotalStock(p.variants) === 0}
              reviewSummary={reviewSummaryByProductId[product.id] ?? null}
            />
          );
        })}
      </div>

      <ShopPagination
        basePath={basePath}
        searchParams={urlSearchParams}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalCount={pagination.total}
      />
    </>
  );
});
