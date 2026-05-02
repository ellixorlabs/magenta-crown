"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthGoogleSection } from "@/components/auth/AuthGoogleSection";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        if (!cancelled) setSessionChecked(true);
        return;
      }
      const session = (await supabase.auth.getSession())?.data.session;
      if (cancelled) return;
      if (session?.user) {
        const token = session.access_token;
        if (token) {
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        window.location.assign(callbackUrl);
        return;
      }
      setSessionChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [callbackUrl]);

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (signInError) {
        setError(signInError.message || "Invalid email or password.");
        return;
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (token) {
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      window.location.href = callbackUrl;
    } catch {
      setError("Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  if (!sessionChecked) {
    return (
      <AuthImmersiveShell>
        <div className="mx-auto w-full max-w-[560px] p-1 text-center md:p-2">
          <p className="text-sm text-zinc-500">Checking your session…</p>
        </div>
      </AuthImmersiveShell>
    );
  }

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-[560px] p-1 md:p-2">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-950">
          Welcome back
        </h1>
        <p className="mt-0.5 text-center text-sm text-zinc-500">Sign in to continue shopping</p>

        <form onSubmit={onSubmit} className="mt-3.5 space-y-2.5">
          <div>
            <label className="text-xs font-semibold text-zinc-800">Email address</label>
            <input
              type="email"
              required
              placeholder="example@email.com"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-800">Password</label>
            <input
              type="password"
              required
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="-mt-2 text-right">
            <Link href="/auth/forgot-password" className="text-xs font-semibold text-crown-800 underline underline-offset-2">
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1.5 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="my-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
        <AuthGoogleSection callbackUrl={callbackUrl} />

        <p className="mt-3 text-center text-sm font-medium text-zinc-800">
          No account?{" "}
          <button
            type="button"
            onClick={() => router.push("/auth/signup?callbackUrl=" + encodeURIComponent(callbackUrl))}
            className="font-semibold text-crown-900 underline decoration-2 underline-offset-2"
          >
            Create one
          </button>
        </p>
      </div>
    </AuthImmersiveShell>
  );
}

export function SignInClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-gradient-to-b from-white via-[#faf7f8] to-[#f0e8ec]">
          <div className="mx-auto max-w-md pt-32 text-center text-sm text-zinc-500">Loading…</div>
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}
