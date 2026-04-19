import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { randomId } from "@/lib/random-id";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdminRole(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 3MB)" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF" }, { status: 400 });
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";

  const buf = Buffer.from(await file.arrayBuffer());
  const dir = join(process.cwd(), "public", "uploads", "products");
  await mkdir(dir, { recursive: true });
  const name = `${randomId()}.${ext}`;
  const diskPath = join(dir, name);
  await writeFile(diskPath, buf);

  const url = `/uploads/products/${name}`;
  return NextResponse.json({ url });
}
