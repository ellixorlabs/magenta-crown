"use client";

import { useState } from "react";
import {
  getSafeCallbackUrl,
  MC_OAUTH_PENDING_EXTERNAL_KEY,
  rememberOAuthReturnForCallback
} from "@/lib/auth-callback";
import { isStandaloneDisplayMode } from "@/lib/pwa-standalone";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

type Props = {
  callbackUrl: string;
  /** Override button styles (e.g. Figma burgundy auth screen). */
  buttonClassName?: string;
  /** Mobile Figma: icon-first; full label from `md`. */
  compactMobile?: boolean;
};

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Renders “Continue with Google” only when the server registered the Google provider.
 * If env keys are missing or the dev server was not restarted, shows a short setup hint.
 */
export function AuthGoogleSection({ callbackUrl, buttonClassName, compactMobile }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={loading}
        className={
          buttonClassName ??
          `mt-8 flex w-full items-center justify-center gap-2 rounded-full border-2 border-zinc-300 bg-white py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 ${compactMobile ? "md:gap-2" : ""}`
        }
        onClick={async () => {
          setError(null);
          setLoading(true);
          try {
            const supabase = await getSupabaseClientOrNull();
            if (!supabase) {
              setError("Supabase is not configured. Add keys in .env and restart dev server.");
              setLoading(false);
              return;
            }
            const origin = window.location.origin.replace(/\/+$/, "");
            try {
              sessionStorage.setItem(MC_OAUTH_PENDING_EXTERNAL_KEY, String(Date.now()));
            } catch {
              /* ignore */
            }
            const nextPath = getSafeCallbackUrl(callbackUrl);
            rememberOAuthReturnForCallback(nextPath);
            const qs = new URLSearchParams();
            qs.set("next", nextPath);
            if (isStandaloneDisplayMode()) {
              qs.set("oauth_context", "pwa_standalone");
            }
            const redirectTo = `${origin}/auth/callback?${qs.toString()}`;
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo,
                queryParams: {
                  prompt: "select_account"
                }
              }
            });
            if (oauthError) throw oauthError;
          } catch (e) {
            setError(e instanceof Error ? e.message : "Google sign-in failed.");
            setLoading(false);
          }
        }}
      >
        {loading ? (
          "Redirecting..."
        ) : compactMobile ? (
          <>
            <GoogleGlyph className="h-7 w-7 md:h-5 md:w-5" />
            <span className="hidden md:inline">Continue with Google</span>
          </>
        ) : (
          <>
            <GoogleGlyph className="h-5 w-5" />
            Continue with Google
          </>
        )}
      </button>
      {error ? (
        <p className="mt-2 text-center text-xs text-red-200 md:text-red-600">{error}</p>
      ) : null}
    </>
  );
}
