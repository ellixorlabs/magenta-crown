"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AuthImmersiveShell } from "@/components/auth/AuthImmersiveShell";
import { getSafeCallbackUrl } from "@/lib/auth-callback";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const email = searchParams.get("email")?.trim() ?? "";

  return (
    <AuthImmersiveShell>
      <div className="w-full max-w-[560px] rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_24px_64px_-18px_rgba(0,0,0,0.22)]">
        <h1 className="text-center font-[family-name:var(--font-heading)] text-4xl font-semibold text-zinc-950">
          Verify your email
        </h1>
        <p className="mt-4 text-center text-sm text-zinc-700">
          Account created successfully. Please verify your email from your inbox, then login.
        </p>
        {email ? (
          <p className="mt-2 text-center text-xs text-zinc-500">
            Verification email sent to <span className="font-semibold">{email}</span>
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => router.push("/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl))}
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
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

