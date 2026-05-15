import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isFullAdmin } from "@/lib/admin-auth";
import { parseHomePageConfigPayload } from "@/lib/home-page-config-payload";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isFullAdmin(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    imageUrl?: string;
    authVisualImageUrl?: string;
    globalSizeChartImageUrl?: string;
    faviconUrl?: string;
    breathingLogoUrl?: string;
    pwaIcon192Url?: string;
    pwaIcon512Url?: string;
    appleTouchIconUrl?: string;
    brandMarkMode?: "text" | "image";
    brandText?: string;
    brandImageUrl?: string;
    brandFontFamily?: string;
    shareMessageTemplate?: string;
  };
  const imageUrl = String(body.imageUrl ?? "").trim();
  const authVisualImageUrlBody =
    "authVisualImageUrl" in body && typeof body.authVisualImageUrl === "string"
      ? body.authVisualImageUrl.trim()
      : undefined;
  const globalSizeChartImageUrl = String(body.globalSizeChartImageUrl ?? "").trim();
  const faviconUrl = String(body.faviconUrl ?? "").trim();
  const breathingLogoUrl = String(body.breathingLogoUrl ?? "").trim();
  const pwaIcon192Url = String(body.pwaIcon192Url ?? "").trim();
  const pwaIcon512Url = String(body.pwaIcon512Url ?? "").trim();
  const appleTouchIconUrl = String(body.appleTouchIconUrl ?? "").trim();
  const brandMarkMode = body.brandMarkMode === "image" ? "image" : body.brandMarkMode === "text" ? "text" : null;
  const brandText = String(body.brandText ?? "").trim();
  const brandImageUrl = String(body.brandImageUrl ?? "").trim();
  const brandFontFamily = String(body.brandFontFamily ?? "").trim();
  const shareMessageTemplate = String(body.shareMessageTemplate ?? "").trim();

  const supabase = getSupabaseServiceRoleClient();
  const { data: row } = await (supabase.from("HomePageConfig") as any)
    .select("payload")
    .eq("id", "default")
    .maybeSingle();
  const payload = parseHomePageConfigPayload(row?.payload);
  if (authVisualImageUrlBody !== undefined) {
    payload.authVisualImageUrl = authVisualImageUrlBody;
  } else if ("imageUrl" in body) {
    payload.authVisualImageUrl = imageUrl;
  }
  if ("globalSizeChartImageUrl" in body) payload.globalSizeChartImageUrl = globalSizeChartImageUrl;
  if (faviconUrl || "faviconUrl" in body) payload.faviconUrl = faviconUrl;
  if (breathingLogoUrl || "breathingLogoUrl" in body) payload.breathingLogoUrl = breathingLogoUrl;
  if (pwaIcon192Url || "pwaIcon192Url" in body) payload.pwaIcon192Url = pwaIcon192Url;
  if (pwaIcon512Url || "pwaIcon512Url" in body) payload.pwaIcon512Url = pwaIcon512Url;
  if (appleTouchIconUrl || "appleTouchIconUrl" in body) payload.appleTouchIconUrl = appleTouchIconUrl;
  if (brandMarkMode) payload.brandMarkMode = brandMarkMode;
  if (brandText || "brandText" in body) payload.brandText = brandText;
  if (brandImageUrl || "brandImageUrl" in body) payload.brandImageUrl = brandImageUrl;
  if (brandFontFamily || "brandFontFamily" in body) payload.brandFontFamily = brandFontFamily;
  if (shareMessageTemplate || "shareMessageTemplate" in body) payload.shareMessageTemplate = shareMessageTemplate;

  const { error } = await (supabase.from("HomePageConfig") as any).upsert({
    id: "default",
    payload,
    updatedAt: new Date().toISOString()
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("auth-visual-url", "max");
  return NextResponse.json({ ok: true });
}

