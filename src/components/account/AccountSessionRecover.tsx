"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT_RECOVER_PREFIX } from "@/lib/account-recover-storage";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

/** Dedupe concurrent recover runs (e.g. React Strict Mode double effect). */
const inflight = new Map<string, Promise<void>>();

/**
 * Server `auth()` only sees the httpOnly session cookie; Supabase keeps tokens in
 * localStorage until `POST /api/auth/session` runs on the client. When those are
 * out of sync, account pages used to `redirect()` to sign-in while the header
 * still showed a logged-in user. This component syncs the cookie and
 * `router.refresh()`es so the server can render.
 */
export function AccountSessionRecover({ callbackPath }: { callbackPath: string }) {
  const router = useRouter();

  useEffect(() => {
    const attemptsKey = `${ACCOUNT_RECOVER_PREFIX}attempts:${callbackPath}`;
    const signin = `/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`;

    void (async () => {
      const n = Number(sessionStorage.getItem(attemptsKey) ?? "0");
      if (n >= 2) {
        sessionStorage.removeItem(attemptsKey);
        router.replace(signin);
        return;
      }

      let p = inflight.get(callbackPath);
      if (!p) {
        p = (async () => {
          const supabase = await getSupabaseClientOrNull();
          const token = (await supabase?.auth.getSession())?.data.session?.access_token ?? null;

          if (!token) {
            router.replace(signin);
            return;
          }

          await fetch("/api/auth/session", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          sessionStorage.setItem(attemptsKey, String(n + 1));
          router.refresh();
        })();
        inflight.set(callbackPath, p);
        try {
          await p;
        } finally {
          inflight.delete(callbackPath);
        }
      } else {
        await p;
      }
    })();
  }, [callbackPath, router]);

  return (
    <p className="text-sm text-zinc-500" aria-live="polite">
      Restoring your session…
    </p>
  );
}
