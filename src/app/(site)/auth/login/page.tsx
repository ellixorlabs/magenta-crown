"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";

export default function AuthLoginAliasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [secondsLeft, setSecondsLeft] = useState(2);
  const reset = searchParams.get("reset");
  const error = searchParams.get("error");
  const message =
    reset === "success"
      ? "Password changed successfully. Please login again."
      : error
        ? "Invalid or expired reset link"
        : null;

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.replace("/auth/signin");
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [router, secondsLeft]);

  return (
    <AuthImmersiveShell minimalChrome>
      <div className="mx-auto w-full min-w-0 max-w-[min(28rem,100%)] rounded-2xl border-2 border-zinc-200 bg-white p-8 text-center shadow-[0_24px_64px_-18px_rgba(0,0,0,0.45)] ring-1 ring-zinc-950/5">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-950">Login</h1>
        <p className="mt-2 text-sm text-zinc-600">Continue to your account.</p>
        {message ? <p className="mt-4 text-sm text-red-600">{message}</p> : null}
        <p className="mt-2 text-xs text-zinc-500">Redirecting to sign in in {secondsLeft}s...</p>
        <Link
          href="/auth/signin"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Go to login
        </Link>
      </div>
    </AuthImmersiveShell>
  );
}

