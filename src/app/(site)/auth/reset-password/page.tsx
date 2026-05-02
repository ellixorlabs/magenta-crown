"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {
          setError("Invalid or expired reset link.");
        });
        return;
      }

      if (tokenHash) {
        const otpType = type === "recovery" ? "recovery" : null;
        if (!otpType) {
          setError("Invalid reset link type.");
          return;
        }
        await supabase.auth
          .verifyOtp({
            token_hash: tokenHash,
            type: otpType as EmailOtpType
          })
          .catch(() => {
            setError("Invalid or expired reset link.");
          });
      }
    })();
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      const { error: updateError } = await supabase.auth.updateUser({
        password
      });
      if (updateError) {
        setError(updateError.message || "Could not reset password.");
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/auth/signin");
      }, 1200);
    } catch {
      setError("Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-md rounded-2xl border-2 border-zinc-200 bg-white p-8 shadow-[0_24px_64px_-18px_rgba(0,0,0,0.45)] ring-1 ring-zinc-950/5">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-950">Reset password</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
            placeholder="New password"
            autoComplete="new-password"
          />
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {done ? <p className="text-sm text-emerald-700">Password updated successfully. You can now sign in.</p> : null}
          <button
            type="submit"
            disabled={loading || done}
            className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
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
