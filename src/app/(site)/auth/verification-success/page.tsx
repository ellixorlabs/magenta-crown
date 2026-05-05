"use client";

import { useEffect, useState } from "react";

const TARGET_URL = "https://magentacrown.com";

export default function VerificationSuccessPage() {
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    try {
      sessionStorage.removeItem("mc_signup_pending_email");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) {
      window.location.assign(TARGET_URL);
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_12%_10%,#fff6fb_0%,#fdf0f6_35%,#f8e7f0_100%)]">
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-fuchsia-200/45 blur-3xl animate-[verificationGlow_8s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl animate-[verificationGlow_9s_ease-in-out_infinite]" />

      <section className="section-shell flex min-h-dvh items-center justify-center py-10">
        <div className="w-full max-w-xl overflow-hidden rounded-[34px] border border-white/70 bg-white/80 p-8 text-center shadow-[0_30px_100px_-30px_rgba(85,16,54,0.45)] backdrop-blur-xl sm:p-10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_14px_40px_-20px_rgba(29,164,106,0.7)] ring-1 ring-emerald-100/90">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white animate-[verificationPulse_2.6s_ease-in-out_infinite]">
              <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
                <path
                  d="M9.2 16.6 4.9 12.3l1.6-1.6 2.7 2.7 8.3-8.3 1.6 1.6-9.9 9.9Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>

          <h1 className="mt-6 font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900 sm:text-4xl">
            Verification successful
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base">
            Your email is now verified. Welcome to Magenta Crown.
          </p>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-emerald-900">
            Redirecting you to Shop in <span className="font-bold tabular-nums">{secondsLeft}</span> second
            {secondsLeft === 1 ? "" : "s"}...
          </div>

          <a
            href={TARGET_URL}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Go now
          </a>
        </div>
      </section>
    </main>
  );
}

