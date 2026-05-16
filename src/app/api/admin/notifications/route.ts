import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isStaffRole } from "@/lib/admin-permissions";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit") || 40)));
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await (supabase.from("Notification") as any)
    .select("id,type,title,message,isRead,actionUrl,createdAt,metadata")
    .eq("recipientUserId", session.user.id)
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    id?: string;
    markRead?: boolean;
    markAllRead?: boolean;
    clearRead?: boolean;
  };
  const supabase = getSupabaseServiceRoleClient();
  const uid = session.user.id;
  const now = new Date().toISOString();

  if (body.clearRead) {
    const { error } = await (supabase.from("Notification") as any)
      .delete()
      .eq("recipientUserId", uid)
      .eq("isRead", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.markAllRead) {
    const { error } = await (supabase.from("Notification") as any)
      .update({ isRead: true, readAt: now })
      .eq("recipientUserId", uid)
      .eq("isRead", false);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body.markRead === true) {
    patch.isRead = true;
    patch.readAt = now;
  } else if (body.markRead === false) {
    patch.isRead = false;
    patch.readAt = null;
  } else {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await (supabase.from("Notification") as any)
    .update(patch)
    .eq("id", id)
    .eq("recipientUserId", uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
