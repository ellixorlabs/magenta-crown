import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_COOKIE } from "@/auth";
import { prisma } from "@/lib/prisma";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function appUrl(path: string, reqUrl: string, hdrs: Headers) {
  const fProto = hdrs.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const fHost = hdrs.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = hdrs.get("host")?.trim();
  const proto = fProto || "https";
  const chosenHost = (fHost || host || "").trim();

  if (chosenHost && !chosenHost.startsWith("0.0.0.0")) {
    return new URL(path, `${proto}://${chosenHost}`);
  }
  const publicSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (publicSite) return new URL(path, publicSite);
  return new URL(path, reqUrl);
}

export async function GET(req: Request) {
  const hdrs = await headers();
  const cfg = getPublicSupabaseConfig();
  if (!cfg) {
    return NextResponse.redirect(appUrl("/auth/signin?error=supabase_config_missing", req.url, hdrs));
  }

  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(appUrl("/auth/signin?error=missing_code", req.url, hdrs));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          cookieStore.set(c.name, c.value, c.options);
        }
      }
    }
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.access_token || !data.user?.id) {
    return NextResponse.redirect(appUrl("/auth/signin?error=oauth_state", req.url, hdrs));
  }

  const email = data.user.email?.trim().toLowerCase();
  if (email) {
    const metaName =
      typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name.trim() : "";
    const fallbackName = email.split("@")[0] ?? "Customer";
    const name = metaName || fallbackName;
    const existingById = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { id: true, role: true, onboardingComplete: true }
    });
    const existingByEmail = existingById
      ? null
      : await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true, onboardingComplete: true }
        });
    const targetId = existingById?.id ?? existingByEmail?.id ?? data.user.id;
    const role = existingById?.role ?? existingByEmail?.role ?? "CUSTOMER";
    const onboardingComplete =
      existingById?.onboardingComplete ?? existingByEmail?.onboardingComplete ?? true;
    await prisma.user.upsert({
      where: { id: targetId },
      update: { email, name, lastLoginAt: new Date() },
      create: {
        id: targetId,
        email,
        name,
        role,
        onboardingComplete,
        lastLoginAt: new Date()
      }
    });
  }

  cookieStore.set(AUTH_COOKIE, data.session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS
  });

  return NextResponse.redirect(appUrl("/", req.url, hdrs));
}

