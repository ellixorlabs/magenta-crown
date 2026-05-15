import "server-only";

import { unstable_cache } from "next/cache";
import { pickAuthVisualUrl } from "@/lib/auth-visual-pick";
import { parseHomePageConfigPayload } from "@/lib/home-page-config-payload";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

async function readAuthVisualBundle(): Promise<{ imageUrl: string; payload: Record<string, unknown> }> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data: row } = await (supabase.from("HomePageConfig") as any)
      .select("payload")
      .eq("id", "default")
      .maybeSingle();

    const payload = parseHomePageConfigPayload(row?.payload);
    const picked = pickAuthVisualUrl(payload);

    return { imageUrl: picked, payload };
  } catch {
    return { imageUrl: "", payload: {} };
  }
}

/** Config changes rarely; `tags` + `revalidateTag("auth-visual-url", "max")` on admin save bust stale empty cache. */
export const getCachedAuthVisualBundle = unstable_cache(readAuthVisualBundle, ["home-auth-visual-image-url"], {
  revalidate: 300,
  tags: ["auth-visual-url"]
});

export async function getCachedAuthVisualImageUrl(): Promise<string> {
  const b = await getCachedAuthVisualBundle();
  return b.imageUrl;
}

export { pickAuthVisualUrl } from "@/lib/auth-visual-pick";
