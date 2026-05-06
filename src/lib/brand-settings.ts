import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export type BrandMarkMode = "text" | "image";

export type BrandSettings = {
  faviconUrl: string;
  breathingLogoUrl: string;
  pwaIcon192Url: string;
  pwaIcon512Url: string;
  appleTouchIconUrl: string;
  brandMarkMode: BrandMarkMode;
  brandText: string;
  brandImageUrl: string;
  brandFontFamily: string;
};

const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  faviconUrl: "",
  breathingLogoUrl: "",
  pwaIcon192Url: "",
  pwaIcon512Url: "",
  appleTouchIconUrl: "",
  brandMarkMode: "text",
  brandText: "MAGENTA CROWN",
  brandImageUrl: "",
  brandFontFamily: ""
};

export async function getBrandSettings(): Promise<BrandSettings> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data: row } = await (supabase.from("HomePageConfig") as any)
      .select("payload")
      .eq("id", "default")
      .maybeSingle();
    const payload = (row?.payload ?? {}) as Record<string, unknown>;
    return {
      faviconUrl:
        typeof payload.faviconUrl === "string" ? payload.faviconUrl.trim() : DEFAULT_BRAND_SETTINGS.faviconUrl,
      breathingLogoUrl:
        typeof payload.breathingLogoUrl === "string"
          ? payload.breathingLogoUrl.trim()
          : DEFAULT_BRAND_SETTINGS.breathingLogoUrl,
      pwaIcon192Url:
        typeof payload.pwaIcon192Url === "string"
          ? payload.pwaIcon192Url.trim()
          : DEFAULT_BRAND_SETTINGS.pwaIcon192Url,
      pwaIcon512Url:
        typeof payload.pwaIcon512Url === "string"
          ? payload.pwaIcon512Url.trim()
          : DEFAULT_BRAND_SETTINGS.pwaIcon512Url,
      appleTouchIconUrl:
        typeof payload.appleTouchIconUrl === "string"
          ? payload.appleTouchIconUrl.trim()
          : DEFAULT_BRAND_SETTINGS.appleTouchIconUrl,
      brandMarkMode:
        payload.brandMarkMode === "image" || payload.brandMarkMode === "text"
          ? payload.brandMarkMode
          : DEFAULT_BRAND_SETTINGS.brandMarkMode,
      brandText:
        typeof payload.brandText === "string" && payload.brandText.trim()
          ? payload.brandText.trim()
          : DEFAULT_BRAND_SETTINGS.brandText,
      brandImageUrl:
        typeof payload.brandImageUrl === "string" ? payload.brandImageUrl.trim() : DEFAULT_BRAND_SETTINGS.brandImageUrl,
      brandFontFamily:
        typeof payload.brandFontFamily === "string"
          ? payload.brandFontFamily.trim()
          : DEFAULT_BRAND_SETTINGS.brandFontFamily
    };
  } catch {
    return DEFAULT_BRAND_SETTINGS;
  }
}
