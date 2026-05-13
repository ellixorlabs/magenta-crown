"use client";

import { useEffect, useState } from "react";
import {
  appendMcOAuthHintToNextPath,
  getSafeCallbackUrl,
  MC_OAUTH_RETURN_STORAGE_KEY
} from "@/lib/auth-callback";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const supabase = await getSupabaseClientOrNull();
        if (!supabase) {
          if (!cancelled) setError("Supabase is not configured.");
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
            window.setTimeout(() => window.location.replace("/auth/signin"), 1400);
          }
          return;
        }

        // PKCE/email callback support.
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            const existing = (await supabase.auth.getSession()).data.session;
            if (!existing?.access_token && !cancelled) {
              setError("Invalid or expired link.");
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

        // Hash-based callback support: wait while supabase-js processes URL into session.
        let session = (await supabase.auth.getSession()).data.session;
        for (let i = 0; !session && i < 24; i += 1) {
          await sleep(150);
          session = (await supabase.auth.getSession()).data.session;
        }

        if (!session?.access_token) {
          if (!cancelled) {
            setError("Invalid or expired link.");
            window.setTimeout(() => window.location.replace("/auth/signin"), 1400);
          }
          return;
        }

        const authz = { Authorization: `Bearer ${session.access_token}` };
        await fetch("/api/auth/sync-user", { method: "POST", headers: authz }).catch(() => null);
        await fetch("/api/auth/session", {
          method: "POST",
          headers: authz,
          credentials: "same-origin"
        }).catch(() => null);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-dvh bg-[#f8f5f6] px-4 py-20">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-950">
          {error ? "Authentication failed" : "Completing sign in"}
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          {error
            ? "Invalid or expired link"
            : loading
              ? "Please wait while we verify your secure link..."
              : "Redirecting..."}
        </p>
      </div>
    </main>
  );
}
