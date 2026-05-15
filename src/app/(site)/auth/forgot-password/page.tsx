"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        setError("Supabase is not configured. Add keys in .env and restart dev server.");
        return;
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/create-new-password`
      });
      if (resetError) {
        setError(resetError.message || "Could not send reset link.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not send reset link.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-1.5 h-14 w-full rounded-full border border-neutral-300 bg-white px-5 text-base text-zinc-950 placeholder:text-neutral-400 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/15 sm:text-sm";
  const labelClass = "text-sm font-medium text-zinc-800";
  const btnPrimary =
    "h-14 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <AuthImmersiveShell minimalChrome>
      <div className="mx-auto flex w-full min-w-0 max-w-[560px] flex-col gap-5 px-6 py-8 text-left lg:px-10 lg:py-16">
        <header>
          <h1 className="font-mc-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
            Forgot password
          </h1>
          <p className="mt-2 text-base text-neutral-500">Enter your account email to receive a reset link.</p>
        </header>

        <form onSubmit={onSubmit} className="flex min-w-0 flex-col">
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="auth-forgot-email">
                Email
              </label>
              <input
                id="auth-forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
                placeholder="you@example.com"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {done ? <p className="text-sm text-emerald-700">If this email exists, a reset link has been sent.</p> : null}
          </div>
          <div className="mt-6">
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-neutral-500">
          We&apos;ll never share your email. Read our{" "}
          <Link href="/legal/privacy" className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-950">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="text-center text-sm text-zinc-800">
          <Link href="/auth/signin" className="font-semibold text-crown-900 underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthImmersiveShell>
  );
}
