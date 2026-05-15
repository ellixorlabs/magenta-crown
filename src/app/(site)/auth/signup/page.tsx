"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthGoogleSection } from "@/components/auth/AuthGoogleSection";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { OAuthExternalContextHint } from "@/components/auth/OAuthExternalContextHint";
import { getSafeCallbackUrl } from "@/lib/auth-callback";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

const SIGNUP_PENDING_EMAIL_KEY = "mc_signup_pending_email";

function normalizeSupabaseAuthError(err: unknown): string {
  if (!err) return "Could not create account. Please try again.";
  const message =
    typeof err === "string"
      ? err
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "";
  const raw = message.trim();
  const lower = raw.toLowerCase();

  // Supabase can mask duplicate signup cases; keep UX explicit.
  if (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("user already") ||
    lower.includes("email already")
  ) {
    return "Account already exists. Use a different email or use Forgot password.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Network issue while creating account. Please check connection and try again.";
  }
  if (!raw || raw === "{}" || raw === "[object object]") {
    return "Could not create account right now. Please try again.";
  }
  return raw;
}

async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), 5000);
    const res = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
      signal: controller.signal
    });
    window.clearTimeout(t);
    if (!res.ok) return false;
    const data = (await res.json()) as { exists?: boolean };
    return Boolean(data.exists);
  } catch {
    return false;
  }
}

function SignUpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (!normalizedEmail) {
        setError("Email is required.");
        return;
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SIGNUP_PENDING_EMAIL_KEY, normalizedEmail);
      }
      if (await checkEmailExists(normalizedEmail)) {
        setError("Account already exists. Use a different email or use Forgot password.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`
        }
      });
      if (signUpError) {
        setError(normalizeSupabaseAuthError(signUpError));
        return;
      }

      const identities = data.user?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        setError("Account already exists. Use a different email or use Forgot password.");
        return;
      }

      // If signup returns a session immediately (email confirmation disabled), sync local profile row now.
      const token = data.session?.access_token;
      if (token) {
        sessionStorage.removeItem(SIGNUP_PENDING_EMAIL_KEY);
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        router.replace(callbackUrl);
        return;
      }

      // Confirmation email path.
      router.push(`/auth/verify-email?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    } catch (err) {
      setError(normalizeSupabaseAuthError(err));
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
    <AuthImmersiveShell mobileAlign="top" minimalChrome>
      <div className="mx-auto flex w-full min-w-0 max-w-[560px] flex-col gap-5 px-6 py-8 text-left lg:px-10 lg:py-16">
        <header>
          <h1 className="font-mc-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
            Create account
          </h1>
          <p className="mt-2 text-base text-neutral-500">Join our exclusive boutique</p>
        </header>

        <form onSubmit={onSubmit} className="flex min-w-0 flex-col">
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="auth-signup-name">
                Name
              </label>
              <input
                id="auth-signup-name"
                required
                placeholder="Type here..."
                className={fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="auth-signup-email">
                Mail ID
              </label>
              <input
                id="auth-signup-email"
                type="email"
                required
                placeholder="Type here..."
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="auth-signup-password">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="auth-signup-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Type here..."
                  className={`${fieldClass} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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
            <div>
              <label className={labelClass} htmlFor="auth-signup-confirm">
                Confirm Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="auth-signup-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Type here..."
                  className={`${fieldClass} pr-12`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-zinc-900"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="mt-6">
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? "Creating…" : "Sign Up"}
            </button>
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
          By creating an account you agree to our{" "}
          <Link href="/legal/terms" className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-950">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-950">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="flex flex-wrap items-center justify-center gap-1 text-center text-sm text-zinc-800">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={() => router.push("/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl))}
            className="font-mc-heading font-semibold text-crown-900 underline decoration-2 underline-offset-4"
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
        <div className="min-h-dvh bg-[radial-gradient(140%_85%_at_50%_30%,#7f0a3a_0%,#6b0028_52%,#5a0023_100%)] md:bg-gradient-to-b md:from-white md:via-[#faf7f8] md:to-[#f0e8ec]">
          <div className="mx-auto max-w-md pt-32 text-center text-sm text-white/80 md:text-zinc-500">Loading…</div>
        </div>
      }
    >
      <SignUpInner />
    </Suspense>
  );
}
