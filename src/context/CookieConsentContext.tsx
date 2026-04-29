"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

const STORAGE_KEY = "magenta-crown-cookie-consent";
const COOKIE_NAME = "mc_cookie_consent";
const DELAY_MS = 6000;

export type ConsentChoice = "accepted" | "declined" | null;

type CookieConsentContextValue = {
  consent: ConsentChoice;
  hasConsented: boolean;
  accept: () => void;
  decline: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function readStored(): ConsentChoice {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "accepted" || v === "declined") return v;
  return null;
}

function setClientCookie(value: "accepted" | "declined") {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearTimerRef(ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (ref.current != null) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [consent, setConsent] = useState<ConsentChoice>(null);
  const [hydrated, setHydrated] = useState(false);
  const [delayDone, setDelayDone] = useState(false);

  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayDoneRef = useRef(false);
  delayDoneRef.current = delayDone;
  /** Hysteresis: avoid starting/canceling the 6s timer every frame when the hero edge sits near the threshold. */
  const heroPastLatchRef = useRef(false);
  const consentTickRafRef = useRef<number | null>(null);

  useEffect(() => {
    setConsent(readStored());
    setHydrated(true);
  }, []);

  const accept = useCallback(() => {
    setConsent("accepted");
    localStorage.setItem(STORAGE_KEY, "accepted");
    setClientCookie("accepted");
  }, []);

  const decline = useCallback(() => {
    setConsent("declined");
    localStorage.setItem(STORAGE_KEY, "declined");
    setClientCookie("declined");
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      hasConsented: consent === "accepted",
      accept,
      decline
    }),
    [accept, consent, decline]
  );

  const scheduleDelay = useCallback(() => {
    if (delayDoneRef.current) return;
    if (delayTimerRef.current != null) return;
    delayTimerRef.current = setTimeout(() => {
      delayTimerRef.current = null;
      delayDoneRef.current = true;
      setDelayDone(true);
    }, DELAY_MS);
  }, []);

  const cancelDelay = useCallback(() => {
    clearTimerRef(delayTimerRef);
  }, []);

  /* On route change: clear timer and reset deferred prompt so delayDone never leaks across navigations (e.g. /shop → /). */
  useEffect(() => {
    if (!hydrated || consent !== null) return;
    clearTimerRef(delayTimerRef);
    delayDoneRef.current = false;
    setDelayDone(false);
    heroPastLatchRef.current = false;
  }, [pathname, hydrated, consent]);

  /* Non-home: start 6s countdown immediately (nothing to scroll past). */
  useEffect(() => {
    if (!hydrated || consent !== null || isHome) return;
    scheduleDelay();
    return () => cancelDelay();
  }, [hydrated, consent, isHome, pathname, scheduleDelay, cancelDelay]);

  /* Home: start 6s only after scrolling past #landing-hero; cancel if user scrolls back before it fires. */
  useEffect(() => {
    if (!hydrated || consent !== null || !isHome) return;

    const runTick = () => {
      if (delayDoneRef.current) return;
      const el = document.getElementById("landing-hero");
      if (!el) {
        heroPastLatchRef.current = false;
        cancelDelay();
        return;
      }
      const bottom = el.getBoundingClientRect().bottom;
      const ENTER = 72;
      const EXIT = 130;
      if (!heroPastLatchRef.current) {
        if (bottom < ENTER) heroPastLatchRef.current = true;
      } else if (bottom > EXIT) {
        heroPastLatchRef.current = false;
      }
      if (heroPastLatchRef.current) scheduleDelay();
      else cancelDelay();
    };

    const tick = () => {
      if (consentTickRafRef.current != null) return;
      consentTickRafRef.current = requestAnimationFrame(() => {
        consentTickRafRef.current = null;
        runTick();
      });
    };

    runTick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      if (consentTickRafRef.current != null) {
        cancelAnimationFrame(consentTickRafRef.current);
        consentTickRafRef.current = null;
      }
      cancelDelay();
    };
  }, [hydrated, consent, isHome, pathname, scheduleDelay, cancelDelay]);

  const showModal = hydrated && consent === null && delayDone;

  useEffect(() => {
    if (!showModal) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [showModal]);

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {showModal && typeof document !== "undefined"
        ? createPortal(<CookieConsentModal />, document.body)
        : null}
    </CookieConsentContext.Provider>
  );
}

function CookieConsentModal() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) return null;

  return (
    <div
      className="mc-viewport-fill pointer-events-auto fixed inset-0 z-[2147483000] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      style={{ isolation: "isolate" }}
    >
      <div className="absolute inset-0 bg-zinc-950/55 backdrop-blur-[2px]" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        className="relative z-[1] w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.45)] sm:max-w-lg sm:p-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id="cookie-consent-title"
          className="font-[family-name:var(--font-heading)] text-xl font-semibold text-zinc-900 sm:text-2xl"
        >
          Cookies & privacy
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          We use essential cookies to keep you signed in and run the boutique. With your permission we also remember
          preferences in this browser. See our{" "}
          <a href="/legal/cookies" className="font-medium text-crown-800 underline underline-offset-2">
            Cookie policy
          </a>
          .
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className="order-2 w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.99] sm:order-1 sm:w-auto"
            onClick={() => ctx.decline()}
          >
            Decline optional
          </button>
          <button
            type="button"
            className="order-1 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-zinc-800 active:scale-[0.99] sm:order-2 sm:w-auto"
            onClick={() => ctx.accept()}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return context;
}
