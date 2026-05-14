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

  return (
    <AuthImmersiveShell minimalChrome>
      <div className="w-full max-w-md rounded-2xl border-2 border-zinc-200 bg-white p-8 shadow-[0_24px_64px_-18px_rgba(0,0,0,0.45)] ring-1 ring-zinc-950/5">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-950">Forgot password</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">Enter your account email to receive a reset link.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
            placeholder="you@example.com"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {done ? <p className="text-sm text-emerald-700">If this email exists, a reset link has been sent.</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
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
