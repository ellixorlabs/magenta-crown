"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { getSafeCallbackUrl } from "@/lib/auth-callback";

function SignUpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email.trim().toLowerCase(), password })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not register");
        return;
      }
      const sign = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl
      });
      if (sign?.error) {
        setError("Account created — please sign in.");
        router.push("/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl));
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-md rounded-2xl border-2 border-zinc-200 bg-white p-8 shadow-[0_24px_64px_-18px_rgba(0,0,0,0.45)] ring-1 ring-zinc-950/5">
        <p className="font-site-brand text-center text-xs font-semibold uppercase tracking-[0.35em] text-zinc-800">
          Magenta Crown
        </p>
        <h1 className="mt-3 text-center font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-950">
          Create account
        </h1>

        <button
          type="button"
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border-2 border-zinc-300 bg-zinc-50 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-100"
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continue with Google
        </button>

        <div className="my-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700">or email</span>
          <div className="h-px flex-1 bg-zinc-300" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-800">Name</label>
            <input
              className="mt-1.5 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-800">Email</label>
            <input
              type="email"
              required
              className="mt-1.5 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-800">Password (8+ characters)</label>
            <input
              type="password"
              required
              minLength={8}
              className="mt-1.5 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-medium text-zinc-800">
          Already have an account?{" "}
          <Link
            href={"/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl)}
            className="font-semibold text-crown-900 underline decoration-2 underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthImmersiveShell>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950">
          <div className="mx-auto max-w-md pt-32 text-center text-sm text-white/60">Loading…</div>
        </div>
      }
    >
      <SignUpInner />
    </Suspense>
  );
}
