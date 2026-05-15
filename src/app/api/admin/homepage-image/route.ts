import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { canManageHomepage } from "@/lib/admin-auth";
import { randomId } from "@/lib/random-id";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "homepage";
const BANNER_CACHE_CONTROL = "public, max-age=31536000, immutable";

async function compressLegacyHomepageImage(input: Buffer): Promise<Buffer> {
  for (const quality of [82, 76, 70, 64, 58, 52, 46]) {
    const out = await sharp(input)
      .rotate()
      .resize({ width: 2400, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (out.length <= MAX_OUTPUT_BYTES) return out;
  }
  throw new Error("Unable to compress image below 2MB");
}

async function encodeBannerVariant(
  input: Buffer,
  opts: { maxWidth: number; qualityStart: number }
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { maxWidth, qualityStart } = opts;
  for (const quality of [qualityStart, qualityStart - 4, qualityStart - 8, qualityStart - 12, 60, 54, 48]) {
    const q = Math.max(45, quality);
    const buffer = await sharp(input)
      .rotate()
      .resize({
        width: maxWidth,
        height: maxWidth * 2,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({ quality: q })
      .toBuffer();
    if (buffer.length <= MAX_OUTPUT_BYTES) {
      const dims = await sharp(buffer).metadata();
      return { buffer, width: dims.width ?? maxWidth, height: dims.height ?? maxWidth };
    }
  }
  throw new Error("Unable to compress banner image below 2MB");
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !canManageHomepage(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const sectionId = String(form.get("sectionId") ?? "").trim() || "general";
  const scope = String(form.get("scope") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB input)" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WEBP" }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const input = Buffer.from(await file.arrayBuffer());

    if (scope === "banner") {
      const variant = String(form.get("bannerVariant") ?? "").trim();
      if (variant !== "desktop" && variant !== "mobile") {
        return NextResponse.json({ error: "bannerVariant must be desktop or mobile" }, { status: 400 });
      }
      const { buffer: webp, width, height } = await encodeBannerVariant(input, {
        maxWidth: variant === "desktop" ? 1920 : 768,
        qualityStart: variant === "desktop" ? 83 : 77
      });
      const folder = variant === "desktop" ? "banners/desktop" : "banners/mobile";
      const path = `${folder}/${Date.now()}-${randomId()}.webp`;
      const upload = await supabaseAdmin.storage.from(BUCKET).upload(path, webp, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: BANNER_CACHE_CONTROL
      });
      if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });
      const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      return NextResponse.json({
        url: data.publicUrl,
        width,
        height,
        bytes: webp.length
      });
    }

    if (sectionId.includes("..") || sectionId.startsWith("banners/")) {
      return NextResponse.json({ error: "Invalid sectionId" }, { status: 400 });
    }

    const webp = await compressLegacyHomepageImage(input);
    const path = `${sectionId}/${Date.now()}-${randomId()}.webp`;
    const upload = await supabaseAdmin.storage.from(BUCKET).upload(path, webp, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "public, max-age=86400"
    });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });
    const dims = await sharp(webp).metadata();
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({
      url: data.publicUrl,
      width: dims.width ?? null,
      height: dims.height ?? null,
      bytes: webp.length
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
