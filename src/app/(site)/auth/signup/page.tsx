"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthGoogleSection } from "@/components/auth/AuthGoogleSection";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
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
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/verification-success")}`
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
        router.refresh();
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

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-[560px] p-1 md:p-2">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-950">
          Create account
        </h1>
        <p className="mt-0.5 text-center text-sm text-zinc-500">Join our exclusive boutique</p>
        <form onSubmit={onSubmit} className="mt-3.5 space-y-2.5">
          <div>
            <label className="text-xs font-semibold text-zinc-800">Full name</label>
            <input
              required
              placeholder="Enter your name"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-800">Email address</label>
            <input
              type="email"
              required
              placeholder="example@email.com"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-800">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 pr-11 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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
          <div>
            <label className="text-xs font-semibold text-zinc-800">Confirm password</label>
            <div className="relative mt-1">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 pr-11 text-base text-zinc-950 placeholder:text-zinc-400 sm:text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-1.5 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>

        <div className="my-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
        <AuthGoogleSection callbackUrl={callbackUrl} />

        <p className="mt-3 flex flex-wrap items-center justify-center gap-1 px-2 text-center text-sm font-medium text-zinc-800">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={() => router.push("/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl))}
            className="font-semibold text-crown-900 underline decoration-2 underline-offset-2"
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
