"use client";

import type { HomePagePayloadV1 } from "@/lib/home-page-types";
import { HomePageBlocksEditor } from "./HomePageBlocksEditor";

type Props = {
  initial: HomePagePayloadV1;
};

export function HomePageEditorClient({ initial }: Props) {
  return <HomePageBlocksEditor initial={initial} />;
}
