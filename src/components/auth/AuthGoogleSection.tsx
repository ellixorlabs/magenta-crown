"use client";

import { useState } from "react";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

type Props = {
  callbackUrl: string;
};

/**
 * Renders “Continue with Google” only when the server registered the Google provider.
 * If env keys are missing or the dev server was not restarted, shows a short setup hint.
 */
export function AuthGoogleSection({ callbackUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={loading}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full border-2 border-zinc-300 bg-white py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
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
            const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`;
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
        {loading ? "Redirecting..." : "Continue with Google"}
      </button>
      {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
    </>
  );
}
