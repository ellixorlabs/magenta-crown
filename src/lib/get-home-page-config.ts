import { prisma } from "@/lib/prisma";
import { createDefaultHomePagePayload } from "@/lib/home-page-defaults";
import type { HomePagePayloadV1 } from "@/lib/home-page-types";

function isPayloadV1(x: unknown): x is HomePagePayloadV1 {
  return (
    typeof x === "object" &&
    x !== null &&
    "version" in x &&
    (x as { version: unknown }).version === 1 &&
    "sections" in x &&
    Array.isArray((x as { sections: unknown }).sections)
  );
}

export async function getHomePagePayload(): Promise<HomePagePayloadV1> {
  try {
    const row = await prisma.homePageConfig.findUnique({ where: { id: "default" } });
    if (!row?.payload) {
      return createDefaultHomePagePayload();
    }
    if (isPayloadV1(row.payload)) {
      return row.payload;
    }
    return createDefaultHomePagePayload();
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getHomePagePayload] Database unreachable — using default homepage layout.");
    }
    return createDefaultHomePagePayload();
  }
}
