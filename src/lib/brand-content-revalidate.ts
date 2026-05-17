import { revalidatePath, revalidateTag } from "next/cache";
import { BRAND_CONTENT_CACHE_TAG } from "@/lib/brand-content";

const PUBLIC_PATHS = [
  "/about",
  "/support",
  "/faqs",
  "/returns",
  "/legal/terms",
  "/legal/privacy",
  "/legal/cookies",
  "/support/faqs",
  "/support/returns",
  "/support/contact"
] as const;

export function revalidateBrandContent() {
  revalidateTag(BRAND_CONTENT_CACHE_TAG, "max");
  for (const p of PUBLIC_PATHS) revalidatePath(p);
}
