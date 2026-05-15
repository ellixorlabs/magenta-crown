import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCachedSession, AUTH_COOKIE } from "@/auth";
import { getSupabaseUserFromRequest } from "@/lib/supabase-server-auth";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function GET() {
  const session = await getCachedSession();
  if (!session) {
    (await cookies()).delete(AUTH_COOKIE);
  }
  return NextResponse.json({ session });
}

export async function POST(req: Request) {
  const user = await getSupabaseUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  (await cookies()).set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(AUTH_COOKIE);
  return NextResponse.json({ ok: true });
}

