"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Inner() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid staff credentials.");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-[#1a0a12] to-zinc-900 px-4 py-16 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 0%, rgba(196,165,120,0.25), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(120,40,80,0.2), transparent 45%)"
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.45em] text-white/50">Magenta Crown</p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-wide">
            Staff sign-in
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Boutique console — not the customer account page.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            onClick={() => signIn("google", { callbackUrl })}
          >
            Continue with Google
          </button>

          <div className="my-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">or staff email</span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Password</label>
              <input
                type="password"
                required
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#C5A059] py-3 text-sm font-semibold text-zinc-950 hover:bg-[#d4b06d] disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Enter admin"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-white/50">
            Shopping as a customer?{" "}
            <Link href="/auth/signin" className="font-medium text-[#C5A059] underline-offset-2 hover:underline">
              Customer sign-in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export function AdminSignInClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <Inner />
    </Suspense>
  );
}
