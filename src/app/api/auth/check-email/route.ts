import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || !email.includes("@")) {
    return NextResponse.json({ exists: false });
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await (supabase.from("User") as any)
      .select("id")
      .eq("email", email)
      .limit(1);
    if (error) throw new Error("lookup_failed");
    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json({ exists: true });
    }

    // Fallback check in Supabase Auth so unverified users are also detected.
    let page = 1;
    const perPage = 200;
    while (true) {
      const listed = await supabase.auth.admin.listUsers({ page, perPage });
      if (listed.error) break;
      const users = listed.data?.users ?? [];
      if (users.length === 0) break;
      if (users.some((u) => (u.email ?? "").trim().toLowerCase() === email)) {
        return NextResponse.json({ exists: true });
      }
      if (users.length < perPage) break;
      page += 1;
    }
    return NextResponse.json({ exists: false });
  } catch {
    return NextResponse.json({ exists: false });
  }
}

