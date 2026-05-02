import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ exists: false });

  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await (supabase.from("User") as any)
      .select("id")
      .eq("email", email)
      .limit(1);
    if (error) throw new Error(error.message);
    return NextResponse.json({ exists: Array.isArray(data) && data.length > 0 });
  } catch {
    return NextResponse.json({ exists: false });
  }
}

