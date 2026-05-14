"use client";

import { useEffect, useState } from "react";
import {
  appendMcOAuthHintToNextPath,
  getSafeCallbackUrl,
  MC_OAUTH_RETURN_STORAGE_KEY
} from "@/lib/auth-callback";
import { McAuthBrandMark } from "@/components/mc/McAuthBrandMark";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";
import { isStandaloneDisplayMode } from "@/lib/pwa-standalone";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function syncSessionAfterExchange(accessToken: string) {
  const authz = { Authorization: `Bearer ${accessToken}` };
  await fetch("/api/auth/sync-user", { method: "POST", headers: authz }).catch(() => null);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: authz,
      credentials: "same-origin"
    }).catch(() => null);
    if (res?.ok) return;
    await sleep(100 * (attempt + 1));
  }
}

type ViewMode = "signing" | "handoff" | "error";

export default function AuthCallbackPage() {
  const [mode, setMode] = useState<ViewMode>("signing");
  const [error, setError] = useState<string | null>(null);
  const [handoffPath, setHandoffPath] = useState<string>("/");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const supabase = await getSupabaseClientOrNull();
        if (!supabase) {
          if (!cancelled) {
            setError("Supabase is not configured.");
            setMode("error");
          }
          return;
        }

        const url = new URL(window.location.href);
        const oauthContext = url.searchParams.get("oauth_context");
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const callbackType = (hashParams.get("type") ?? url.searchParams.get("type") ?? "").toLowerCase();
        const hashError = hashParams.get("error_description") || hashParams.get("error");
        if (hashError) {
          if (!cancelled) {
            setError("Invalid or expired link.");
            setMode("error");
            window.setTimeout(() => window.location.replace("/auth/signin"), 1400);
          }
          return;
        }

        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            const existing = (await supabase.auth.getSession()).data.session;
            if (!existing?.access_token && !cancelled) {
              setError("Invalid or expired link.");
              setMode("error");
              window.setTimeout(() => window.location.replace("/auth/signin"), 1400);
              return;
            }
          }
        } else if (tokenHash && callbackType) {
          await supabase.auth
            .verifyOtp({
              token_hash: tokenHash,
              type: callbackType as Parameters<typeof supabase.auth.verifyOtp>[0]["type"]
            })
            .catch(() => {
              /* let session poll decide final status */
            });
        }

        let session = (await supabase.auth.getSession()).data.session;
        for (let i = 0; !session && i < 24; i += 1) {
          await sleep(150);
          session = (await supabase.auth.getSession()).data.session;
        }

        if (!session?.access_token) {
          if (!cancelled) {
            setError("Invalid or expired link.");
            setMode("error");
            window.setTimeout(() => window.location.replace("/auth/signin"), 1400);
          }
          return;
        }

        await syncSessionAfterExchange(session.access_token);

        if (cancelled) return;

        let nextRaw = url.searchParams.get("next");
        if (!nextRaw) {
          try {
            nextRaw = sessionStorage.getItem(MC_OAUTH_RETURN_STORAGE_KEY);
            sessionStorage.removeItem(MC_OAUTH_RETURN_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }
        let nextSafe = getSafeCallbackUrl(nextRaw);
        if (oauthContext === "pwa_standalone" && nextSafe.startsWith("/")) {
          nextSafe = appendMcOAuthHintToNextPath(nextSafe, "pwa");
        }

        if (callbackType === "recovery") {
          window.location.replace("/auth/create-new-password");
          return;
        }

        const safariPwaOAuthHandoff =
          Boolean(code) &&
          oauthContext === "pwa_standalone" &&
          !isStandaloneDisplayMode();

        if (safariPwaOAuthHandoff) {
          const target = nextSafe && nextSafe !== "/auth/callback" ? nextSafe : "/";
          if (!cancelled) {
            setHandoffPath(target);
            setMode("handoff");
          }
          return;
        }

        if (tokenHash && callbackType && !code) {
          window.location.replace(nextSafe && nextSafe !== "/auth/callback" ? nextSafe : "/auth/verification-success");
          return;
        }

        if (code) {
          if (nextSafe && nextSafe !== "/auth/callback") {
            window.location.replace(nextSafe);
            return;
          }
          window.location.replace("/");
          return;
        }

        window.location.replace(nextSafe && nextSafe !== "/auth/callback" ? nextSafe : "/auth/verification-success");
      } catch {
        if (!cancelled) {
          setError("Something went wrong.");
          setMode("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/+$/, "") : "";
  const handoffHref = `${origin}${handoffPath}`;

  if (mode === "handoff") {
    return (
      <main className="fixed inset-0 z-[60] flex min-h-dvh flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-[#fdf8fa] via-[#f8f5f6] to-[#f3eef1] px-6 py-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white/95 p-8 text-center shadow-sm backdrop-blur-sm">
          <McAuthBrandMark className="mb-2" />
          <h1 className="font-mc-heading text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            You&apos;re signed in on this browser
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            On iPhone, Safari and your home screen Magenta Crown app keep separate login storage. We cannot merge them
            without a server-side token handoff.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Continue to your destination here, or switch to the installed app manually when you need that context.
          </p>
          <a
            href={handoffHref}
            className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-mc-gold px-5 py-3.5 text-sm font-bold text-mc-ink shadow-sm transition hover:bg-mc-goldDeep"
          >
            Open in Magenta Crown app
          </a>
          <p className="mt-3 text-xs text-zinc-500">Uses the same secure page link; open your home screen icon separately if you prefer the app shell.</p>
        </div>
      </main>
    );
  }

  if (mode === "error") {
    return (
      <main className="fixed inset-0 z-[60] flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-[#fdf8fa] via-[#f8f5f6] to-[#f3eef1] px-6">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <McAuthBrandMark className="mb-2" />
          <h1 className="font-mc-heading text-xl font-semibold text-zinc-950">Authentication failed</h1>
          <p className="mt-3 text-sm text-zinc-600">{error ?? "Invalid or expired link"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[60] flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-[#fdf8fa] via-[#f8f5f6] to-[#f3eef1] px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <McAuthBrandMark />
        <p className="font-mc-heading mt-8 text-lg font-semibold tracking-tight text-zinc-950 sm:text-xl">
          Signing you into Magenta Crown…
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Securing your session and syncing your account. This only takes a moment.
        </p>
          <div
          className="mt-10 h-1.5 w-44 overflow-hidden rounded-full bg-zinc-200/90"
          role="progressbar"
          aria-label="Signing in"
        >
          <div className="h-full w-[45%] animate-pulse rounded-full bg-gradient-to-r from-mc-gold/40 via-mc-gold to-mc-goldDeep/85" />
        </div>
      </div>
    </main>
  );
}
