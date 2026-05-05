"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthGoogleSection } from "@/components/auth/AuthGoogleSection";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { McAuthBrandMark } from "@/components/mc/McAuthBrandMark";
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
          <p className="text-sm text-white/80 md:text-zinc-500">Checking your session…</p>
        </div>
      </AuthImmersiveShell>
    );
  }

  const fieldClass =
    "mt-1.5 w-full rounded-2xl border-0 bg-mc-input px-4 py-3.5 font-[family-name:var(--font-body)] text-base text-mc-ink placeholder:italic placeholder:text-mc-muted/75 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] outline-none transition focus:ring-2 focus:ring-mc-gold/55 md:border md:border-zinc-200 md:bg-white md:shadow-none md:focus:ring-mc-gold/35 sm:text-sm";
  const labelClass =
    "font-mc-heading text-sm font-normal text-white md:text-xs md:font-semibold md:text-zinc-800";

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-[400px] px-1 md:max-w-[560px] md:p-2">
        <McAuthBrandMark className="mb-8 md:mb-0 md:hidden" />
        <h1 className="hidden text-center font-mc-heading text-3xl font-semibold text-zinc-950 md:block">Welcome back</h1>
        <p className="mt-1 hidden text-center text-sm text-zinc-500 md:block">Sign in to continue shopping</p>

        <form onSubmit={onSubmit} className="mt-2 space-y-4 md:mt-3.5 md:space-y-2.5">
          <div>
            <label className={labelClass}>Email</label>
            <input
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
                <label className={labelClass}>Password</label>
                <div className="relative mt-1.5">
                  <input
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
                    className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-mc-muted hover:text-mc-ink md:text-zinc-500 md:hover:text-zinc-800"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="-mt-1 text-right">
                <Link
                  href="/auth/forgot-password"
                  className="font-mc-heading text-sm italic text-mc-gold underline underline-offset-4 md:text-xs md:not-italic md:font-semibold md:text-crown-800"
                >
                  Forgot password?
                </Link>
              </div>
            </>
          ) : null}
          {error && <p className="text-sm text-red-200 md:text-red-600">{error}</p>}
          {magicMessage && <p className="text-sm text-emerald-200 md:text-emerald-700">{magicMessage}</p>}
          {resendMessage && <p className="text-sm text-emerald-200 md:text-emerald-700">{resendMessage}</p>}
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
              className="w-full rounded-2xl border border-white/25 bg-white/10 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15 disabled:opacity-50 md:rounded-lg md:border-zinc-300 md:bg-white md:text-zinc-800 md:hover:bg-zinc-50 md:backdrop-blur-none"
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
              className="mt-1 w-full rounded-2xl bg-mc-gold py-3.5 text-sm font-bold text-mc-ink shadow-sm transition hover:bg-mc-goldDeep disabled:opacity-50 md:mt-1.5 md:rounded-lg md:bg-zinc-900 md:py-2.5 md:font-semibold md:text-white md:hover:bg-zinc-800"
            >
              {checkingEmail ? "Checking..." : "Continue"}
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-2xl bg-mc-gold py-3.5 text-sm font-bold text-mc-ink shadow-sm transition hover:bg-mc-goldDeep disabled:opacity-50 md:mt-1.5 md:rounded-lg md:bg-zinc-900 md:py-2.5 md:font-semibold md:text-white md:hover:bg-zinc-800"
              >
                {loading ? "Signing in…" : "Login"}
              </button>
              <button
                type="button"
                onClick={() => void sendMagicLink()}
                disabled={magicLoading}
                className="w-full rounded-2xl border border-white/25 bg-white/10 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15 disabled:opacity-50 md:rounded-lg md:border-zinc-300 md:bg-white md:text-zinc-800 md:hover:bg-zinc-50"
              >
                {magicLoading ? "Sending magic link…" : "Sign in with magic link"}
              </button>
            </>
          )}
        </form>

        <div className="my-5 flex items-center gap-3 md:my-3">
          <div className="h-px flex-1 bg-white/35 md:bg-zinc-200" />
          <span className="font-mc-heading text-xs text-white md:text-zinc-500">Or Sign Up with</span>
          <div className="h-px flex-1 bg-white/35 md:bg-zinc-200" />
        </div>
        <AuthGoogleSection
          callbackUrl={callbackUrl}
          compactMobile
          buttonClassName="mx-auto mt-0 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/40 bg-white shadow-md transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-60 md:mx-0 md:mt-8 md:h-auto md:w-full md:gap-2 md:rounded-full md:border-2 md:border-zinc-300 md:py-3 md:text-sm md:font-semibold md:text-zinc-900"
        />

        <p className="mt-6 text-center text-sm font-medium text-white/90 md:mt-3 md:text-zinc-800">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/auth/signup?callbackUrl=" + encodeURIComponent(callbackUrl))}
            className="font-mc-heading font-semibold text-mc-gold underline decoration-2 underline-offset-4 md:font-semibold md:text-crown-900"
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
