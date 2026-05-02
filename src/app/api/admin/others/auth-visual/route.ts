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

  const body = (await req.json().catch(() => ({}))) as { imageUrl?: string; globalSizeChartImageUrl?: string };
  const imageUrl = String(body.imageUrl ?? "").trim();
  const globalSizeChartImageUrl = String(body.globalSizeChartImageUrl ?? "").trim();

  const supabase = getSupabaseServiceRoleClient();
  const { data: row } = await (supabase.from("HomePageConfig") as any)
    .select("payload")
    .eq("id", "default")
    .maybeSingle();
  const payload = ((row?.payload ?? {}) as Record<string, unknown>) || {};
  payload.authVisualImageUrl = imageUrl;
  payload.globalSizeChartImageUrl = globalSizeChartImageUrl;

  const { error } = await (supabase.from("HomePageConfig") as any).upsert({
    id: "default",
    payload,
    updatedAt: new Date().toISOString()
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

