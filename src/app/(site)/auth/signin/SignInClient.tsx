"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicMessage, setMagicMessage] = useState<string | null>(null);
  const [needsVerificationResend, setNeedsVerificationResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
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

  async function checkEmailExists(normalizedEmail: string) {
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: normalizedEmail })
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { exists?: boolean };
      return Boolean(data.exists);
    } catch {
      return false;
    }
  }

  async function continueWithEmail() {
    setError(null);
    setMagicMessage(null);
    setResendMessage(null);
    setNeedsVerificationResend(false);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email first.");
      return;
    }
    setCheckingEmail(true);
    try {
      const exists = await checkEmailExists(normalizedEmail);
      setEmailChecked(true);
      setEmailExists(exists);
      if (!exists) {
        setError("Account does not exist. Please sign up.");
      }
    } finally {
      setCheckingEmail(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailChecked || !emailExists) {
      await continueWithEmail();
      return;
    }
    setError(null);
    setNeedsVerificationResend(false);
    setResendMessage(null);
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
        const message = signInError.message?.toLowerCase() ?? "";
        if (message.includes("email not confirmed")) {
          setNeedsVerificationResend(true);
          setError("Your email is not verified. Resend verification email?");
        } else {
          setError("Invalid email or password.");
        }
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

  async function sendMagicLink() {
    setError(null);
    setMagicMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email first to get a magic link.");
      return;
    }
    if (!emailChecked || !emailExists) {
      await continueWithEmail();
      return;
    }
    setMagicLoading(true);
    try {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        setError("Supabase is not configured. Add keys in .env and restart dev server.");
        return;
      }
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`
        }
      });
      if (otpError) {
        setError("Could not send magic link. Please try again.");
        return;
      }
      setMagicMessage("Magic link sent. Check your email and open the secure sign-in link.");
    } catch {
      setError("Could not send magic link.");
    } finally {
      setMagicLoading(false);
    }
  }

  async function resendVerification(inputEmail: string) {
    const supabase = await getSupabaseClientOrNull();
    if (!supabase) throw new Error("SUPABASE_MISSING");
    await supabase.auth.signInWithOtp({
      email: inputEmail.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendCooldown]);

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
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailChecked(false);
                setEmailExists(false);
                setPassword("");
                setMagicMessage(null);
                setResendMessage(null);
                setNeedsVerificationResend(false);
                setError(null);
              }}
              autoComplete="email"
            />
          </div>
          {emailChecked && emailExists ? (
            <>
              <div>
                <label className="text-xs font-semibold text-zinc-800">Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 pr-11 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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
              </div>
              <div className="-mt-2 text-right">
                <Link href="/auth/forgot-password" className="text-xs font-semibold text-crown-800 underline underline-offset-2">
                  Forgot password?
                </Link>
              </div>
            </>
          ) : null}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {magicMessage && <p className="text-sm text-emerald-700">{magicMessage}</p>}
          {resendMessage && <p className="text-sm text-emerald-700">{resendMessage}</p>}
          {needsVerificationResend && (
            <button
              type="button"
              disabled={resendLoading || resendCooldown > 0}
              onClick={() => {
                void (async () => {
                  setResendLoading(true);
                  setResendMessage(null);
                  setError(null);
                  try {
                    await resendVerification(email);
                    setResendMessage("Verification email sent.");
                    setResendCooldown(30);
                  } catch {
                    setError("Could not resend verification email. Please try again.");
                  } finally {
                    setResendLoading(false);
                  }
                })();
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              {resendLoading
                ? "Sending verification email…"
                : resendCooldown > 0
                  ? `Resend Email (${resendCooldown}s)`
                  : "Resend Email"}
            </button>
          )}
          {!emailChecked || !emailExists ? (
            <button
              type="button"
              onClick={() => void continueWithEmail()}
              disabled={checkingEmail}
              className="mt-1.5 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {checkingEmail ? "Checking..." : "Continue"}
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={loading}
                className="mt-1.5 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in with password"}
              </button>
              <button
                type="button"
                onClick={() => void sendMagicLink()}
                disabled={magicLoading}
                className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                {magicLoading ? "Sending magic link…" : "Sign in with magic link"}
              </button>
            </>
          )}
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
