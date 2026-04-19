"use client";

import type { HomePagePayloadV2 } from "@/lib/home-page-types";
import type { CatalogProduct } from "./HomePageV2Editor";
import { HomePageV2Editor } from "./HomePageV2Editor";

type Props = {
  initial: HomePagePayloadV2;
  catalogProducts: CatalogProduct[];
};

export function HomePageEditorClient({ initial, catalogProducts }: Props) {
  return <HomePageV2Editor initial={initial} catalogProducts={catalogProducts} />;
}
