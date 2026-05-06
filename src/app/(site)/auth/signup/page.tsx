"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthGoogleSection } from "@/components/auth/AuthGoogleSection";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { McAuthBrandMark } from "@/components/mc/McAuthBrandMark";
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
          emailRedirectTo: `${window.location.origin}/auth/callback`
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
    "mt-1.5 w-full rounded-2xl border-0 bg-mc-input px-4 py-3.5 font-[family-name:var(--font-body)] text-base text-mc-ink placeholder:italic placeholder:text-mc-muted/75 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] outline-none transition focus:ring-2 focus:ring-mc-gold/55 md:border md:border-zinc-200 md:bg-white md:shadow-none md:focus:ring-mc-gold/35 sm:text-sm";
  const labelClass =
    "font-mc-heading text-sm font-normal text-white md:text-xs md:font-semibold md:text-zinc-800";

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-[400px] px-1 md:max-w-[560px] md:p-2">
        <McAuthBrandMark className="mb-6 md:mb-0 md:hidden" />
        <h1 className="hidden text-center font-mc-heading text-3xl font-semibold text-zinc-950 md:block">Create account</h1>
        <p className="mt-0.5 hidden text-center text-sm text-zinc-500 md:block">Join our exclusive boutique</p>
        <form onSubmit={onSubmit} className="mt-2 space-y-3.5 md:mt-3.5 md:space-y-2.5">
          <div>
            <label className={labelClass}>Name</label>
            <input
              required
              placeholder="Type here..."
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Mail ID</label>
            <input
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
            <label className={labelClass}>Password</label>
            <div className="relative mt-1.5">
              <input
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
                className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-mc-muted hover:text-mc-ink md:text-zinc-500 md:hover:text-zinc-800"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Confirm Password</label>
            <div className="relative mt-1.5">
              <input
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
                className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-mc-muted hover:text-mc-ink md:text-zinc-500 md:hover:text-zinc-800"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-200 md:text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-2xl bg-mc-gold py-3.5 text-sm font-bold text-mc-ink shadow-sm transition hover:bg-mc-goldDeep disabled:opacity-50 md:mt-1.5 md:rounded-lg md:py-2.5"
          >
            {loading ? "Creating…" : "Sign Up"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 md:my-3">
          <div className="h-px flex-1 bg-white/35 md:bg-zinc-200" />
          <span className="font-mc-heading text-xs text-white md:text-zinc-500">Or Sign Up with</span>
          <div className="h-px flex-1 bg-white/35 md:bg-zinc-200" />
        </div>
        <AuthGoogleSection
          callbackUrl={callbackUrl}
          compactMobile
          buttonClassName="mx-auto mt-0 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/40 bg-white shadow-md transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-60 md:mx-0 md:mt-2 md:h-auto md:w-full md:gap-2 md:rounded-full md:border-2 md:border-zinc-300 md:py-3 md:text-sm md:font-semibold md:text-zinc-900"
        />

        <p className="mt-6 flex flex-wrap items-center justify-center gap-1 px-2 text-center text-sm font-medium text-white/90 md:mt-3 md:text-zinc-800">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={() => router.push("/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl))}
            className="font-mc-heading font-semibold text-mc-gold underline decoration-2 underline-offset-4 md:font-semibold md:text-crown-900"
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
        <div className="min-h-dvh bg-gradient-to-b from-white via-[#faf7f8] to-[#f0e8ec]">
          <div className="mx-auto max-w-md pt-32 text-center text-sm text-zinc-500">Loading…</div>
        </div>
      }
    >
      <SignUpInner />
    </Suspense>
  );
}
