"use client";

import type { HomePageBannerRow } from "@/lib/home-page-banner";
import type { HomePagePayloadV2 } from "@/lib/home-page-types";
import type { CatalogProduct } from "./HomePageV2Editor";
import { HomePageV2Editor } from "./HomePageV2Editor";

type Props = {
  initial: HomePagePayloadV2;
  catalogProducts: CatalogProduct[];
  initialBanners: HomePageBannerRow[];
};

export function HomePageEditorClient({ initial, catalogProducts, initialBanners }: Props) {
  return <HomePageV2Editor initial={initial} catalogProducts={catalogProducts} initialBanners={initialBanners} />;
}
