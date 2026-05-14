"use client";

import { memo } from "react";
import { ProductPdpPurchaseBlock } from "@/components/product/pdp/ProductPdpPurchaseBlock";
import { useProductPdpPurchase, type ProductPdp } from "@/components/product/pdp/use-product-pdp-purchase";

type Props = {
  product: ProductPdp;
  reviewAvg: number | null;
  reviewCount: number;
};

function AddToCartSectionInner(props: Props) {
  const purchase = useProductPdpPurchase(props.product, props.reviewAvg, props.reviewCount);
  return <ProductPdpPurchaseBlock {...props} purchase={purchase} variant="legacy" />;
}

export const AddToCartSection = memo(AddToCartSectionInner);
export { useProductPdpPurchase, pctOff, type ProductPdp } from "@/components/product/pdp/use-product-pdp-purchase";
