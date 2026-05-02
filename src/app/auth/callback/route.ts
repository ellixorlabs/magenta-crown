import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { AUTH_COOKIE } from "@/auth";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import type { UserRow } from "@/lib/db/app-types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

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

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");
  const callbackPath = getSafeCallbackUrl(url.searchParams.get("next") ?? url.searchParams.get("callbackUrl"));

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

  let sessionToken: string | null = null;
  let authUser: User | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user?.id) {
      return NextResponse.redirect(appUrl("/auth/signin?error=oauth_state", req.url, hdrs));
    }
    authUser = data.user;
    sessionToken = data.session?.access_token ?? null;
  } else if (tokenHash && otpType) {
    const allowedOtpTypes = new Set<EmailOtpType>(["signup", "invite", "recovery", "email", "email_change"]);
    if (!allowedOtpTypes.has(otpType as EmailOtpType)) {
      return NextResponse.redirect(appUrl("/auth/signin?error=invalid_link_type", req.url, hdrs));
    }
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType
    });
    if (error || !data.user?.id) {
      return NextResponse.redirect(appUrl("/auth/signin?error=invalid_or_expired_link", req.url, hdrs));
    }
    authUser = data.user;
    sessionToken = data.session?.access_token ?? null;
  } else {
    return NextResponse.redirect(appUrl("/auth/signin?error=missing_auth_params", req.url, hdrs));
  }

  if (!authUser?.id) {
    return NextResponse.redirect(appUrl("/auth/signin?error=oauth_state", req.url, hdrs));
  }

  const email = authUser.email?.trim().toLowerCase();
  if (email) {
    const supabaseAdmin = getSupabaseServiceRoleClient();
    const metaName =
      typeof authUser.user_metadata?.name === "string" ? authUser.user_metadata.name.trim() : "";
    const fallbackName = email.split("@")[0] ?? "Customer";
    const name = metaName || fallbackName;
    const existingById = await supabaseAdmin
      .from("User")
      .select("id,role,onboardingComplete")
      .eq("id", authUser.id)
      .maybeSingle<UserRow>();
    const existingByEmail = existingById
      && existingById.data
      ? null
      : await supabaseAdmin.from("User").select("id,role,onboardingComplete").eq("email", email).maybeSingle<UserRow>();
    const targetId = existingById?.data?.id ?? existingByEmail?.data?.id ?? authUser.id;
    const role = existingById?.data?.role ?? existingByEmail?.data?.role ?? "CUSTOMER";
    const onboardingComplete =
      existingById?.data?.onboardingComplete ?? existingByEmail?.data?.onboardingComplete ?? true;
    const upsert = await (supabaseAdmin.from("User") as any).upsert(
      {
        id: targetId,
        email,
        name,
        role,
        onboardingComplete,
        lastLoginAt: new Date().toISOString()
      },
      { onConflict: "id" }
    );
    if (upsert.error) {
      return NextResponse.redirect(appUrl("/auth/signin?error=profile_sync", req.url, hdrs));
    }
  }

  if (sessionToken) {
    cookieStore.set(AUTH_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS
    });
  }

  return NextResponse.redirect(appUrl(callbackPath, req.url, hdrs));
}

