"use client";

import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { InstallButton } from "@/components/pwa/InstallButton";
import { useHeroReady } from "@/context/HeroReadyContext";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mc-pwa-install-dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function isMobileLike(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  return narrow || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const t = Number.parseInt(raw, 10);
    return Number.isFinite(t) && Date.now() - t < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Mobile-only install UX: Chromium `beforeinstallprompt` + iOS “Add to Home Screen” instructions.
 */
const NOT_NOW_FILL_MS = 5000;

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const { heroReady } = useHeroReady();
  /** Matches `GlobalPageLoader`: home breathing shell only blocks until hero (or fallback) signals ready. */
  const breathingLoaderDone = pathname !== "/" || heroReady;

  const [mounted, setMounted] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [notNowFillActive, setNotNowFillActive] = useState(false);
  const [notNowReady, setNotNowReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (wasDismissedRecently()) setDismissed(true);
  }, []);

  const showChromiumInstall = Boolean(deferred);
  const showIosHint = isIOS() && !showChromiumInstall;
  const promptVisible = showChromiumInstall || showIosHint;

  useEffect(() => {
    if (!mounted || dismissed || !promptVisible || !breathingLoaderDone) return;
    setNotNowFillActive(false);
    setNotNowReady(false);
    const fillStart = window.setTimeout(() => setNotNowFillActive(true), 30);
    const fillDone = window.setTimeout(() => setNotNowReady(true), 30 + NOT_NOW_FILL_MS);
    return () => {
      window.clearTimeout(fillStart);
      window.clearTimeout(fillDone);
    };
  }, [mounted, dismissed, promptVisible, breathingLoaderDone]);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const onDismiss = useCallback(() => {
    rememberDismiss();
    setDismissed(true);
    setIosOpen(false);
  }, []);

  const onInstallClick = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }, [deferred]);

  if (!mounted) return null;
  if (isStandalone()) return null;
  if (dismissed) return null;
  if (!isMobileLike()) return null;

  if (!promptVisible) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[6000] flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
        role="region"
        aria-label="Install app"
      >
        <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-white/95 px-4 py-3 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Download className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold text-zinc-900">Install Magenta Crown for faster experience</p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                {showChromiumInstall
                  ? "Add to your home screen for quick access and a fullscreen app experience."
                  : "On iPhone & iPad, use Safari: tap Share, then “Add to Home Screen”."}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-full p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {showChromiumInstall ? (
              <InstallButton onClick={onInstallClick} className="flex-1">
                Install app
              </InstallButton>
            ) : (
              <button
                type="button"
                onClick={() => setIosOpen((v) => !v)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-crown-800 py-2.5 text-sm font-semibold text-white transition hover:bg-crown-900"
              >
                <Share className="h-4 w-4" aria-hidden />
                How to install
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (notNowReady) onDismiss();
              }}
              aria-disabled={!notNowReady}
              aria-busy={!notNowReady}
              title={notNowReady ? undefined : "Please read the message — dismiss unlocks in a few seconds."}
              className={`relative min-w-[6.5rem] overflow-hidden rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium transition ${
                notNowReady
                  ? "cursor-pointer text-zinc-800 hover:bg-zinc-50"
                  : "pointer-events-none cursor-wait text-zinc-800/90"
              }`}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-zinc-200/95 to-zinc-100/90 transition-[width] ease-linear"
                style={{
                  width: notNowFillActive ? "100%" : "0%",
                  transitionDuration: `${NOT_NOW_FILL_MS}ms`
                }}
              />
              <span className="relative z-[1]">Not now</span>
            </button>
          </div>
          {showIosHint && iosOpen ? (
            <ol className="list-decimal space-y-1.5 pl-5 text-left text-xs text-zinc-700">
              <li>Open this site in Safari (not Chrome).</li>
              <li>Tap the Share button in the toolbar.</li>
              <li>Scroll and tap “Add to Home Screen”, then Add.</li>
            </ol>
          ) : null}
        </div>
      </div>
    </>
  );
}
