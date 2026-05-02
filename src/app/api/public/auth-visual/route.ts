import { NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data: row } = await (supabase.from("HomePageConfig") as any)
      .select("payload")
      .eq("id", "default")
      .maybeSingle();
    const payload = (row?.payload ?? {}) as Record<string, unknown>;
    const imageUrl = typeof payload.authVisualImageUrl === "string" ? payload.authVisualImageUrl : "";
    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json({ imageUrl: "" });
  }
}

