"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthGoogleSection } from "@/components/auth/AuthGoogleSection";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { OAuthExternalContextHint } from "@/components/auth/OAuthExternalContextHint";
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
      <AuthImmersiveShell minimalChrome>
        <div className="mx-auto flex w-full min-w-0 max-w-[560px] flex-col justify-center px-6 py-16 lg:px-10">
          <p className="text-center text-sm text-neutral-500">Checking your session…</p>
        </div>
      </AuthImmersiveShell>
    );
  }

  const fieldClass =
    "mt-1.5 h-14 w-full rounded-full border border-neutral-300 bg-white px-5 text-base text-zinc-950 placeholder:text-neutral-400 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/15 sm:text-sm";
  const labelClass = "text-sm font-medium text-zinc-800";
  const btnPrimary =
    "h-14 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50";
  const btnSecondary =
    "h-14 w-full rounded-full border border-neutral-300 bg-white text-sm font-semibold text-zinc-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <AuthImmersiveShell mobileAlign="center" minimalChrome>
      <div className="mx-auto flex w-full min-w-0 max-w-[560px] flex-col gap-5 px-6 py-8 text-left lg:px-10 lg:py-16">
        <header>
          <h1 className="font-mc-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
            Welcome back
          </h1>
          <p className="mt-2 text-base text-neutral-500">Sign in to continue shopping</p>
        </header>

        <form onSubmit={onSubmit} className="flex min-w-0 flex-col">
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="auth-signin-email">
                Email
              </label>
              <input
                id="auth-signin-email"
                type="email"
                required
                placeholder="Type here..."
                className={fieldClass}
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
                  <label className={labelClass} htmlFor="auth-signin-password">
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="auth-signin-password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Type here..."
                      className={`${fieldClass} pr-12`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-zinc-900"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
                  >
                    Forgot password?
                  </Link>
                </div>
              </>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {magicMessage ? <p className="text-sm text-emerald-700">{magicMessage}</p> : null}
            {resendMessage ? <p className="text-sm text-emerald-700">{resendMessage}</p> : null}
            {needsVerificationResend ? (
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
                className={btnSecondary}
              >
                {resendLoading
                  ? "Sending verification email…"
                  : resendCooldown > 0
                    ? `Resend Email (${resendCooldown}s)`
                    : "Resend Email"}
              </button>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {!emailChecked || !emailExists ? (
              <button
                type="button"
                onClick={() => void continueWithEmail()}
                disabled={checkingEmail}
                className={btnPrimary}
              >
                {checkingEmail ? "Checking..." : "Continue"}
              </button>
            ) : (
              <>
                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading ? "Signing in…" : "Login"}
                </button>
                <button
                  type="button"
                  onClick={() => void sendMagicLink()}
                  disabled={magicLoading}
                  className={btnSecondary}
                >
                  {magicLoading ? "Sending magic link…" : "Sign in with magic link"}
                </button>
              </>
            )}
          </div>
        </form>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Or continue with</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>
          <OAuthExternalContextHint variant="authLight" />
          <AuthGoogleSection callbackUrl={callbackUrl} />
        </div>

        <p className="text-center text-xs text-neutral-500">
          By continuing you agree to our{" "}
          <Link href="/legal/terms" className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-950">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-950">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="text-center text-sm text-zinc-800">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/auth/signup?callbackUrl=" + encodeURIComponent(callbackUrl))}
            className="font-mc-heading font-semibold text-crown-900 underline decoration-2 underline-offset-4"
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
        <div className="min-h-dvh bg-[radial-gradient(140%_85%_at_50%_30%,#7f0a3a_0%,#6b0028_52%,#5a0023_100%)] md:bg-gradient-to-b md:from-white md:via-[#faf7f8] md:to-[#f0e8ec]">
          <div className="mx-auto max-w-md pt-32 text-center text-sm text-white/80 md:text-zinc-500">Loading…</div>
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}
