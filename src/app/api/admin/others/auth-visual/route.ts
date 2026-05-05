import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !isAdminRole(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    imageUrl?: string;
    globalSizeChartImageUrl?: string;
    faviconUrl?: string;
    breathingLogoUrl?: string;
    brandMarkMode?: "text" | "image";
    brandText?: string;
    brandImageUrl?: string;
    brandFontFamily?: string;
    shareMessageTemplate?: string;
  };
  const imageUrl = String(body.imageUrl ?? "").trim();
  const globalSizeChartImageUrl = String(body.globalSizeChartImageUrl ?? "").trim();
  const faviconUrl = String(body.faviconUrl ?? "").trim();
  const breathingLogoUrl = String(body.breathingLogoUrl ?? "").trim();
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
  const payload = ((row?.payload ?? {}) as Record<string, unknown>) || {};
  if ("imageUrl" in body) payload.authVisualImageUrl = imageUrl;
  if ("globalSizeChartImageUrl" in body) payload.globalSizeChartImageUrl = globalSizeChartImageUrl;
  if (faviconUrl || "faviconUrl" in body) payload.faviconUrl = faviconUrl;
  if (breathingLogoUrl || "breathingLogoUrl" in body) payload.breathingLogoUrl = breathingLogoUrl;
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
  return NextResponse.json({ ok: true });
}

