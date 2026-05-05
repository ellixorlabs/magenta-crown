"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

const SIGNUP_PENDING_EMAIL_KEY = "mc_signup_pending_email";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [resendEmail, setResendEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(SIGNUP_PENDING_EMAIL_KEY)?.trim().toLowerCase() ?? "";
    if (saved) setResendEmail(saved);
  }, []);

  async function resendConfirmation() {
    setInfo(null);
    setError(null);
    const email = resendEmail.trim().toLowerCase();
    if (!email) {
      setError("Could not detect signup email. Please return to signup and try again.");
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
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/verification-success")}`
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
        <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-sm text-zinc-700">
          {resendEmail ? `Verification email will be resent to ${resendEmail}` : "Preparing your email address..."}
        </p>

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

