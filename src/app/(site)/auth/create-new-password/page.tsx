"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

export default function CreateNewPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    void (async () => {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        setError("Supabase is not configured. Add keys in .env and restart dev server.");
        return;
      }
      let tokenAccepted = false;
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) tokenAccepted = true;
      }
      if (!tokenAccepted && tokenHash) {
        const otpType = type === "recovery" ? "recovery" : null;
        if (!otpType) {
          setError("Invalid or expired reset link.");
          window.setTimeout(() => router.replace("/auth/login?error=invalid_or_expired_reset_link"), 1200);
          return;
        }
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as EmailOtpType
        });
        if (!otpError) tokenAccepted = true;
      }

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user ?? null;
      if (!user?.id || (!tokenAccepted && !code && !tokenHash)) {
        setError("Invalid or expired reset link.");
        window.setTimeout(() => router.replace("/auth/login?error=invalid_or_expired_reset_link"), 1200);
        return;
      }
      setResetEmail(user.email ?? null);
      setSessionReady(true);
    })();
  }, [router, searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sessionReady) {
      setError("Invalid or expired reset link.");
      window.setTimeout(() => router.replace("/auth/login?error=invalid_or_expired_reset_link"), 1200);
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
    setLoading(true);
    try {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        setError("Supabase is not configured. Add keys in .env and restart dev server.");
        return;
      }
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user?.id) {
        setError("Invalid or expired reset link.");
        window.setTimeout(() => router.replace("/auth/login?error=invalid_or_expired_reset_link"), 1200);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "Could not update password.");
        return;
      }
      await supabase.auth.signOut();
      setDone(true);
      setTimeout(() => router.replace("/auth/login?reset=success"), 1200);
    } catch {
      setError("Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-md rounded-2xl border-2 border-zinc-200 bg-white p-8 shadow-[0_24px_64px_-18px_rgba(0,0,0,0.45)] ring-1 ring-zinc-950/5">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-950">
          Create new password
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-600">
          Set your new password to finish account recovery.
        </p>
        <p className="mt-2 text-center text-xs text-zinc-500">
          {resetEmail ? `Resetting password for: ${resetEmail}` : "Validating secure reset session..."}
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              disabled={!sessionReady}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 pr-11 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              placeholder="New password"
              autoComplete="new-password"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              disabled={!sessionReady}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 pr-11 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {done ? <p className="text-sm text-emerald-700">Password updated successfully.</p> : null}
          <button
            type="submit"
            disabled={loading || done || !sessionReady}
            className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Save new password"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-700">
          <Link href="/auth/signin" className="font-semibold text-crown-900 underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthImmersiveShell>
  );
}

