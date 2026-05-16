import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { randomId } from "@/lib/random-id";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

const BUCKET_IMG = "review_images";
const BUCKET_VID = "review_videos";
const MAX_IMAGE_BATCH_BYTES = 6 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES_PER_REVIEW = 6;
const MAX_VIDEOS_PER_REVIEW = 1;
const ALLOWED_IMG = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VID = new Set(["video/mp4", "video/webm", "video/quicktime"]);

async function webpFullAndThumb(input: Buffer): Promise<{ full: Buffer; thumb: Buffer }> {
  const rotated = sharp(input).rotate();
  const full = await rotated
    .clone()
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const thumb = await rotated
    .clone()
    .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
  return { full, thumb };
}

type RouteCtx = { params: Promise<{ reviewId: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { reviewId } = await ctx.params;
    const rid = String(reviewId ?? "").trim();
    if (!rid) return NextResponse.json({ error: "Missing review." }, { status: 400 });

    const supabase = getSupabaseServiceRoleClient();
    const { data: rev, error: revErr } = await (supabase.from("Review") as any)
      .select("id,userId")
      .eq("id", rid)
      .maybeSingle();
    if (revErr || !rev || rev.userId !== session.user.id) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart form." }, { status: 400 });
    }

    const form = await req.formData();
    const kind = String(form.get("kind") ?? "image").toLowerCase();

    if (kind === "video") {
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "Missing video file." }, { status: 400 });
      }
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: "Video too large (max 20MB)." }, { status: 400 });
      }
      if (!ALLOWED_VID.has(file.type)) {
        return NextResponse.json({ error: "Unsupported video type." }, { status: 400 });
      }
      const { count: vidCount } = await (supabase.from("ReviewMedia") as any)
        .select("id", { count: "exact", head: true })
        .eq("reviewId", rid)
        .eq("type", "VIDEO");
      if ((vidCount ?? 0) >= MAX_VIDEOS_PER_REVIEW) {
        return NextResponse.json({ error: "Maximum one video per review." }, { status: 400 });
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const ext =
        file.type === "video/webm" ? ".webm" : file.type === "video/quicktime" ? ".mov" : ".mp4";
      const path = `${session.user.id}/${rid}/${Date.now()}-${randomId()}${ext}`;
      const up = await supabase.storage.from(BUCKET_VID).upload(path, buf, {
        contentType: file.type,
        upsert: false
      });
      if (up.error) {
        return NextResponse.json({ error: up.error.message }, { status: 500 });
      }
      const { data: pub } = supabase.storage.from(BUCKET_VID).getPublicUrl(path);
      const url = pub.publicUrl;
      const { data: row, error: insErr } = await (supabase.from("ReviewMedia") as any)
        .insert({
          id: randomId(),
          reviewId: rid,
          type: "VIDEO",
          url,
          thumbnailUrl: null,
          sizeBytes: buf.length,
          mimeType: file.type
        })
        .select("id,url,thumbnailUrl,type,sizeBytes,mimeType")
        .single();
      if (insErr) {
        await supabase.storage.from(BUCKET_VID).remove([path]);
        return NextResponse.json({ error: "Could not save video metadata." }, { status: 500 });
      }
      return NextResponse.json({ media: row });
    }

    const files = form.getAll("images").filter((x): x is File => x instanceof File && x.size > 0);
    if (files.length === 0) {
      return NextResponse.json({ error: "No image files." }, { status: 400 });
    }

    const totalIn = files.reduce((s, f) => s + f.size, 0);
    if (totalIn > MAX_IMAGE_BATCH_BYTES) {
      return NextResponse.json({ error: "Total upload exceeds 6MB (try fewer or smaller photos)." }, { status: 400 });
    }

    const { count: imgCount } = await (supabase.from("ReviewMedia") as any)
      .select("id", { count: "exact", head: true })
      .eq("reviewId", rid)
      .eq("type", "IMAGE");
    const existing = imgCount ?? 0;
    if (existing + files.length > MAX_IMAGES_PER_REVIEW) {
      return NextResponse.json({ error: `Maximum ${MAX_IMAGES_PER_REVIEW} images per review.` }, { status: 400 });
    }

    const created: unknown[] = [];
    for (const file of files) {
      if (!ALLOWED_IMG.has(file.type)) {
        return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 400 });
      }
      const input = Buffer.from(await file.arrayBuffer());
      let full: Buffer;
      let thumb: Buffer;
      try {
        const out = await webpFullAndThumb(input);
        full = out.full;
        thumb = out.thumb;
      } catch {
        return NextResponse.json({ error: "Could not process image." }, { status: 400 });
      }

      const base = `${session.user.id}/${rid}/${Date.now()}-${randomId()}`;
      const pathFull = `${base}-full.webp`;
      const pathThumb = `${base}-thumb.webp`;

      const upF = await supabase.storage.from(BUCKET_IMG).upload(pathFull, full, {
        contentType: "image/webp",
        upsert: false
      });
      if (upF.error) return NextResponse.json({ error: upF.error.message }, { status: 500 });
      const upT = await supabase.storage.from(BUCKET_IMG).upload(pathThumb, thumb, {
        contentType: "image/webp",
        upsert: false
      });
      if (upT.error) {
        await supabase.storage.from(BUCKET_IMG).remove([pathFull]);
        return NextResponse.json({ error: upT.error.message }, { status: 500 });
      }

      const url = supabase.storage.from(BUCKET_IMG).getPublicUrl(pathFull).data.publicUrl;
      const thumbnailUrl = supabase.storage.from(BUCKET_IMG).getPublicUrl(pathThumb).data.publicUrl;
      const sizeBytes = full.length + thumb.length;

      const { data: row, error: insErr } = await (supabase.from("ReviewMedia") as any)
        .insert({
          id: randomId(),
          reviewId: rid,
          type: "IMAGE",
          url,
          thumbnailUrl,
          sizeBytes,
          mimeType: "image/webp"
        })
        .select("id,url,thumbnailUrl,type,sizeBytes,mimeType")
        .single();
      if (insErr) {
        await supabase.storage.from(BUCKET_IMG).remove([pathFull, pathThumb]);
        return NextResponse.json({ error: "Could not save image metadata." }, { status: 500 });
      }
      created.push(row);
    }

    return NextResponse.json({ media: created });
  } catch (e) {
    console.error("[reviews/media]", e);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
