import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { randomId } from "@/lib/random-id";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "brandassets";
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/x-icon"]);

async function toWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (!isAdminRole(role) && role !== "SUB_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }
  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "").trim() || "asset";
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const input = Buffer.from(await file.arrayBuffer());
    const lowerName = file.name.toLowerCase();
    const isIco = file.type === "image/x-icon" || lowerName.endsWith(".ico");
    const isSvg = file.type === "image/svg+xml" || lowerName.endsWith(".svg");
    const pathBase = `${kind}/${Date.now()}-${randomId()}`;
    const path = isIco ? `${pathBase}.ico` : isSvg ? `${pathBase}.svg` : `${pathBase}.webp`;
    const body = isIco || isSvg ? input : await toWebp(input);
    const contentType = isIco ? "image/x-icon" : isSvg ? "image/svg+xml" : "image/webp";
    const upload = await supabaseAdmin.storage.from(BUCKET).upload(path, body, {
      contentType,
      upsert: false
    });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 }
    );
  }
}
