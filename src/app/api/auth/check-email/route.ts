import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = getRateLimitKey(req, "auth-check-email");
  const gate = consumeRateLimit(key, 20, 60_000);
  if (!gate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

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
    return NextResponse.json({ exists: Array.isArray(data) && data.length > 0 });
  } catch {
    return NextResponse.json({ exists: false });
  }
}

