import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { randomId } from "@/lib/random-id";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "products-images";

async function compressImageToWebp(input: Buffer): Promise<Buffer> {
  // Keep trying lower quality until the output is around ~1–2MB.
  for (const quality of [82, 76, 70, 64, 58, 52, 46]) {
    const out = await sharp(input)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (out.length <= MAX_OUTPUT_BYTES) return out;
  }
  throw new Error("Unable to compress image below 2MB");
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
  const productIdRaw = String(form.get("productId") ?? "").trim();
  const productId = productIdRaw || "draft";
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WEBP" }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const input = Buffer.from(await file.arrayBuffer());
    const webp = await compressImageToWebp(input);
    const path = `${productId}/${Date.now()}-${randomId()}.webp`;

    const upload = await supabaseAdmin.storage.from(BUCKET).upload(path, webp, {
      contentType: "image/webp",
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
