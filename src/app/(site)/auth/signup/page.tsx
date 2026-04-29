"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthGoogleSection } from "@/components/auth/AuthGoogleSection";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

function SignUpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!name.trim()) {
        setError("Name is required.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        setError("Supabase is not configured. Add keys in .env and restart dev server.");
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            callbackUrl
          )}`
        }
      });
      if (signUpError) {
        setError(signUpError.message || "Could not create account.");
        return;
      }

      // If signup returns a session immediately (email confirmation disabled), sync local profile row now.
      const token = data.session?.access_token;
      if (token) {
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        router.replace(callbackUrl);
        router.refresh();
        return;
      }

      // Confirmation email path.
      setError(
        "Account created. Please verify your email from the inbox, then sign in."
      );
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-md rounded-2xl border-2 border-zinc-200 bg-white p-8 shadow-[0_24px_64px_-18px_rgba(0,0,0,0.45)] ring-1 ring-zinc-950/5">
        <p className="font-site-brand text-center text-xs font-semibold uppercase tracking-[0.35em] text-zinc-800">
          Magenta Crown
        </p>
        <h1 className="mt-3 text-center font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-950">
          Create account
        </h1>

        <AuthGoogleSection callbackUrl={callbackUrl} />

        <div className="my-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700">or email</span>
          <div className="h-px flex-1 bg-zinc-300" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-800">Name</label>
            <input
              required
              className="mt-1.5 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-800">Email</label>
            <input
              type="email"
              required
              className="mt-1.5 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-800">Password (8+ characters)</label>
            <input
              type="password"
              required
              minLength={8}
              className="mt-1.5 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-800">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              className="mt-1.5 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-medium text-zinc-800">
          Already have an account?{" "}
          <Link
            href={"/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl)}
            className="font-semibold text-crown-900 underline decoration-2 underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthImmersiveShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-gradient-to-b from-white via-[#faf7f8] to-[#f0e8ec]">
          <div className="mx-auto max-w-md pt-32 text-center text-sm text-zinc-500">Loading…</div>
        </div>
      }
    >
      <SignUpInner />
    </Suspense>
  );
}
