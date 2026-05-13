"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { OAuthExternalContextHint } from "@/components/auth/OAuthExternalContextHint";
import { getSafeCallbackUrl, MC_OAUTH_PENDING_EXTERNAL_KEY } from "@/lib/auth-callback";
import { isStandaloneDisplayMode } from "@/lib/pwa-standalone";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

function Inner() {
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl") ?? "/admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        setError("Supabase is not configured. Add keys in .env and restart dev server.");
        return;
      }
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (loginError) {
        setError("Invalid staff credentials.");
        return;
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError("Could not establish session.");
        return;
      }
      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      const me = (await (await fetch("/api/auth/session", { cache: "no-store" })).json()) as {
        session?: { user?: { role?: string } } | null;
      };
      const staff =
        me.session?.user?.role === "ADMIN" || me.session?.user?.role === "SUB_ADMIN";
      if (!staff) {
        await supabase.auth.signOut();
        await fetch("/api/auth/session", { method: "DELETE" });
        setError("This account is not allowed for admin panel.");
        return;
      }
      window.location.href = callbackUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-gradient-to-br from-zinc-950 via-[#1a0a12] to-zinc-900 px-4 py-12 text-white sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 0%, rgba(196,165,120,0.25), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(120,40,80,0.2), transparent 45%)"
        }}
      />

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-md pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)]">
        <div className="mb-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.45em] text-white/50">Magenta Crown</p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-wide">
            Staff sign-in
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Boutique console — not the customer account page.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-3">
            <OAuthExternalContextHint variant="admin" />
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const supabase = await getSupabaseClientOrNull();
                if (!supabase) {
                  setError("Supabase is not configured. Add keys in .env and restart dev server.");
                  return;
                }
                try {
                  sessionStorage.setItem(MC_OAUTH_PENDING_EXTERNAL_KEY, String(Date.now()));
                } catch {
                  /* ignore */
                }
                const origin = window.location.origin.replace(/\/+$/, "");
                const qs = new URLSearchParams();
                qs.set("next", callbackUrl);
                if (isStandaloneDisplayMode()) {
                  qs.set("oauth_context", "pwa_standalone");
                }
                const redirectTo = `${origin}/auth/callback?${qs.toString()}`;
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo,
                    queryParams: {
                      prompt: "select_account"
                    }
                  }
                });
                if (error) setError(error.message);
              } finally {
                setLoading(false);
              }
            }}
          >
            Continue with Google
          </button>
          </div>

          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">or staff email</span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2.5 text-base text-white placeholder:text-white/30 sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2.5 pr-11 text-base text-white placeholder:text-white/30 sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-white/60 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#C5A059] py-3 text-sm font-semibold text-zinc-950 hover:bg-[#d4b06d] disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Enter admin"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-white/50">
            Shopping as a customer?{" "}
            <Link href="/auth/signin" className="font-medium text-[#C5A059] underline-offset-2 hover:underline">
              Customer sign-in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export function AdminSignInClient() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-zinc-950" />}>
      <Inner />
    </Suspense>
  );
}
