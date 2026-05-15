import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageInventory } from "@/lib/admin-auth";
import { randomId } from "@/lib/random-id";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set(["video/mp4"]);
const BUCKET = "products-videos";

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !canManageInventory(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const productIdRaw = String(form.get("productId") ?? "").trim();
  const productId = productIdRaw || "draft";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "Video too large (max 20MB)" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only MP4 videos are allowed" }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const buf = Buffer.from(await file.arrayBuffer());
    const path = `${productId}/${Date.now()}-${randomId()}.mp4`;

    const upload = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, {
      contentType: "video/mp4",
      upsert: false
    });
    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

