"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [resendEmail, setResendEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resendConfirmation() {
    setInfo(null);
    setError(null);
    const email = resendEmail.trim().toLowerCase();
    if (!email) {
      setError("Enter your email to resend verification.");
      return;
    }
    setLoading(true);
    try {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        setError("Supabase is not configured. Add keys in .env and restart dev server.");
        return;
      }
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`
        }
      });
      if (resendError) {
        setError(resendError.message || "Could not resend confirmation email.");
        return;
      }
      setInfo("Verification email sent again.");
    } catch {
      setError("Could not resend confirmation email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-[560px] rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_24px_64px_-18px_rgba(0,0,0,0.22)]">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-4xl font-semibold text-zinc-950">
          Verify your email
        </h1>
        <p className="mt-4 text-center text-sm text-zinc-700">
          Account created successfully. Please verify your email from your inbox, then login.
        </p>
        <div className="mt-3">
          <input
            type="email"
            placeholder="Enter your email for resend"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </div>

        {info ? <p className="mt-3 text-center text-xs text-emerald-700">{info}</p> : null}
        {error ? <p className="mt-3 text-center text-xs text-red-600">{error}</p> : null}
        <button
          type="button"
          onClick={() => void resendConfirmation()}
          disabled={loading}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Resend verification email"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl))}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Login here
        </button>
      </div>
    </AuthImmersiveShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-gradient-to-b from-white via-[#faf7f8] to-[#f0e8ec]">
          <div className="mx-auto max-w-md pt-32 text-center text-sm text-zinc-500">Loading…</div>
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}

