"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { MC_OAUTH_PENDING_EXTERNAL_KEY } from "@/lib/auth-callback";

const PENDING_MAX_MS = 15 * 60 * 1000;

function readPendingTs(): number | null {
  try {
    const raw = sessionStorage.getItem(MC_OAUTH_PENDING_EXTERNAL_KEY);
    if (raw == null) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(MC_OAUTH_PENDING_EXTERNAL_KEY);
  } catch {
    /* ignore */
  }
}

type Props = {
  variant?: "immersive" | "admin";
};

export function OAuthExternalContextHint({ variant = "immersive" }: Props) {
  const { isAuthenticated, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);

  const evaluate = useCallback(() => {
    const ts = readPendingTs();
    if (ts == null) {
      setVisible(false);
      return;
    }
    if (Date.now() - ts > PENDING_MAX_MS) {
      clearPending();
      setVisible(false);
      return;
    }
    if (!isLoading && !isAuthenticated) setVisible(true);
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    evaluate();
    document.addEventListener("visibilitychange", evaluate);
    window.addEventListener("focus", evaluate);
    return () => {
      document.removeEventListener("visibilitychange", evaluate);
      window.removeEventListener("focus", evaluate);
    };
  }, [evaluate]);

  useEffect(() => {
    if (isAuthenticated) {
      clearPending();
      setVisible(false);
    }
  }, [isAuthenticated]);

  const dismiss = () => {
    clearPending();
    setVisible(false);
  };

  if (!visible) return null;

  const box =
    variant === "admin"
      ? "rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left text-sm leading-relaxed text-white/90"
      : "rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-left text-sm leading-relaxed text-white/90 md:border-zinc-200 md:bg-amber-50 md:text-zinc-800";

  const dismissClass =
    variant === "admin"
      ? "mt-3 text-xs font-semibold uppercase tracking-wide text-[#C5A059] underline underline-offset-2"
      : "mt-3 text-xs font-semibold uppercase tracking-wide text-mc-gold underline underline-offset-2 md:text-crown-900";

  return (
    <div className={box} role="status">
      <p className="font-medium md:font-semibold">
        Google sign-in may have opened in the system browser (for example when using an installed app on iPhone). That
        browser keeps its own login session.
      </p>
      <p className="mt-2">
        <span className="font-semibold">In this window</span>, use email and password or a magic link. Your cart stays on
        this device until checkout.
      </p>
      <button type="button" onClick={dismiss} className={dismissClass}>
        Dismiss
      </button>
    </div>
  );
}
