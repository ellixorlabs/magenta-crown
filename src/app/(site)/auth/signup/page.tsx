"use client";

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

  async function emailAlreadyExists(inputEmail: string) {
    try {
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(inputEmail)}`, {
        cache: "no-store"
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { exists?: boolean };
      return Boolean(data.exists);
    } catch {
      return false;
    }
  }

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
      const normalizedEmail = email.trim().toLowerCase();
      if (await emailAlreadyExists(normalizedEmail)) {
        setError("Email already exists.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            callbackUrl
          )}`
        }
      });
      if (signUpError) {
        const message = signUpError.message?.toLowerCase() ?? "";
        if (message.includes("already") || message.includes("registered") || message.includes("rate limit")) {
          setError("Email already exists.");
        } else {
          setError(signUpError.message || "Could not create account.");
        }
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
      router.push(
        `/auth/verify-email?callbackUrl=${encodeURIComponent(callbackUrl)}&email=${encodeURIComponent(
          normalizedEmail
        )}`
      );
      return;
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-[560px] p-1 md:p-2">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-950">
          Create account
        </h1>
        <p className="mt-0.5 text-center text-sm text-zinc-500">Join our exclusive boutique</p>
        <form onSubmit={onSubmit} className="mt-3.5 space-y-2.5">
          <div>
            <label className="text-xs font-semibold text-zinc-800">Full name</label>
            <input
              required
              placeholder="Enter your name"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              minLength={8}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-800">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1.5 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>

        <div className="my-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
        <AuthGoogleSection callbackUrl={callbackUrl} />

        <p className="mt-3 text-center text-sm font-medium text-zinc-800">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl))}
            className="font-semibold text-crown-900 underline decoration-2 underline-offset-2"
          >
            Login here
          </button>
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
