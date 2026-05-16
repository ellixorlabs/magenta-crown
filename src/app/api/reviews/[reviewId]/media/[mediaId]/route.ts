import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { storageObjectPathFromPublicUrl } from "@/lib/storage-public-url";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ reviewId: string; mediaId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { reviewId, mediaId } = await ctx.params;
  const rid = String(reviewId ?? "").trim();
  const mid = String(mediaId ?? "").trim();
  if (!rid || !mid) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const supabase = getSupabaseServiceRoleClient();
  const { data: rev } = await (supabase.from("Review") as any).select("id,userId").eq("id", rid).maybeSingle();
  if (!rev || rev.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: media, error: mErr } = await (supabase.from("ReviewMedia") as any)
    .select("id,reviewId,type,url,thumbnailUrl")
    .eq("id", mid)
    .eq("reviewId", rid)
    .maybeSingle();
  if (mErr || !media) return NextResponse.json({ error: "Media not found." }, { status: 404 });

  const pathsImg: string[] = [];
  const pathsVid: string[] = [];
  if (media.type === "IMAGE") {
    const p = storageObjectPathFromPublicUrl(String(media.url), "review_images");
    const pt = media.thumbnailUrl ? storageObjectPathFromPublicUrl(String(media.thumbnailUrl), "review_images") : null;
    if (p) pathsImg.push(p);
    if (pt) pathsImg.push(pt);
  } else {
    const p = storageObjectPathFromPublicUrl(String(media.url), "review_videos");
    if (p) pathsVid.push(p);
  }
  if (pathsImg.length) await supabase.storage.from("review_images").remove(pathsImg);
  if (pathsVid.length) await supabase.storage.from("review_videos").remove(pathsVid);

  const { error: delErr } = await (supabase.from("ReviewMedia") as any).delete().eq("id", mid).eq("reviewId", rid);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
