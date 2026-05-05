"use client";

import { useMemo } from "react";

type Props = {
  productName: string;
  introText?: string;
  /**
   * Extra bottom offset to avoid overlap with sticky UI.
   * Example: "bottom-24" if a bottom nav is present.
   */
  bottomOffsetClassName?: string;
};

function buildWhatsAppHref(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function FloatingWhatsAppButton({
  productName,
  introText = "Check this out",
  bottomOffsetClassName = "bottom-[max(1rem,env(safe-area-inset-bottom))]"
}: Props) {
  const fallbackMessage = useMemo(
    () => `${introText}: ${productName}`,
    [introText, productName]
  );

  return (
    <a
      href={buildWhatsAppHref(fallbackMessage)}
      target="_blank"
      rel="noreferrer"
      aria-label="Share on WhatsApp"
      className={`group fixed right-4 z-[4500] ${bottomOffsetClassName} md:right-6`}
      onClick={(e) => {
        const href = window.location.href;
        const message = `${introText}: ${productName}\n${href}`;
        (e.currentTarget as HTMLAnchorElement).href = buildWhatsAppHref(message);
      }}
    >
      <span className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-400/45 via-green-400/35 to-lime-300/40 opacity-70 blur-md transition duration-300 group-hover:opacity-100" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/45 bg-white/30 text-emerald-600 shadow-[0_18px_40px_-20px_rgba(7,94,84,0.85)] backdrop-blur-xl transition duration-300 group-hover:scale-[1.04] group-hover:bg-white/45 md:h-12 md:w-12 motion-safe:animate-[waPulse_3.2s_ease-in-out_infinite]">
        {/* Brand-style WhatsApp icon (Font Awesome path) */}
        <svg viewBox="0 0 448 512" className="h-7 w-7 md:h-6 md:w-6 fill-current" aria-hidden>
          <path d="M380.9 97.1C339-6.1 219.9-38.5 117.9 13.3C15.9 65.1-27.8 183.5 8.6 286.2L0 512l232.4-60.9c101.8 36.4 218.9-7.1 270.3-103.8c51.4-96.7 22-216.2-68-250.2zm-43.1 220.6c-5.4 15.1-31.8 29.3-43.8 31.2c-11.2 1.8-25.3 2.6-40.8-2.3c-9.4-3-21.5-7-37.1-13.7c-65.2-28.2-107.8-94.1-111.1-98.6c-3.3-4.4-26.5-35.3-26.5-67.4s16.8-47.9 22.8-54.5c6-6.6 13.1-8.3 17.5-8.3c4.4 0 8.8 .1 12.7 .2c4.1 .2 9.5-1.6 14.8 11.1c5.4 13.1 18.3 45.2 19.9 48.5c1.6 3.3 2.7 7.2 .5 11.6c-2.2 4.4-3.3 7.2-6.5 11.1c-3.3 3.8-6.9 8.6-9.8 11.5c-3.3 3.3-6.7 6.9-2.9 13.6c3.8 6.6 16.9 27.9 36.2 45.2c24.9 22.2 45.9 29.1 52.5 32.4c6.5 3.3 10.4 2.7 14.2-1.6c3.8-4.4 16.4-19.2 20.8-25.8c4.4-6.6 8.8-5.5 14.8-3.3c6 .2 37.9 17.9 44.4 21.2c6.5 3.3 10.9 4.9 12.5 7.7c1.6 2.7 1.6 15.9-3.8 31z" />
        </svg>
      </span>
    </a>
  );
}

