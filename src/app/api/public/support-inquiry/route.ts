import { NextResponse } from "next/server";
import { randomId } from "@/lib/random-id";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const message = String(body.message ?? "").trim();
    const phone = String(body.phone ?? "").trim() || null;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "Message too long." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { error } = await (supabase.from("SupportInquiry") as any).insert({
      id: randomId(),
      name,
      email,
      phone,
      message,
      status: "OPEN"
    });
    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Support is temporarily unavailable." }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not send message." }, { status: 500 });
  }
}
