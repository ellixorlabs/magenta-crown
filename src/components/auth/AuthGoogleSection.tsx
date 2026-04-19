"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

type Props = {
  callbackUrl: string;
};

/**
 * Renders “Continue with Google” only when the server registered the Google provider.
 * If env keys are missing or the dev server was not restarted, shows a short setup hint.
 */
export function AuthGoogleSection({ callbackUrl }: Props) {
  const [googleOn, setGoogleOn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (!cancelled) setGoogleOn(Boolean(data?.google));
      })
      .catch(() => {
        if (!cancelled) setGoogleOn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (googleOn === false) {
    return (
      <div className="mt-8 rounded-2xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-left text-xs leading-relaxed text-amber-950 shadow-sm">
        <p className="font-semibold text-amber-900">Google sign-in is not active</p>
        <p className="mt-2 text-amber-950/90">
          The server did not load a Google provider. Add <code className="rounded bg-white/80 px-1 font-mono text-[11px]">AUTH_GOOGLE_ID</code> and{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-[11px]">AUTH_GOOGLE_SECRET</code> to{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-[11px]">.env.local</code>, set{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-[11px]">AUTH_URL</code> to this site&apos;s origin (no trailing slash), restart{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-[11px]">npm run dev</code>, and in Google Cloud Console add redirect URI{" "}
          <code className="mt-1 block break-all rounded bg-white/80 px-1 py-0.5 font-mono text-[11px]">
            {typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback/google
          </code>
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={googleOn !== true}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border-2 border-zinc-300 bg-white py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => void signIn("google", { callbackUrl })}
      >
        Continue with Google
      </button>
      {googleOn === null ? (
        <p className="mt-2 text-center text-xs text-zinc-500" aria-live="polite">
          Loading sign-in options…
        </p>
      ) : null}
    </>
  );
}
