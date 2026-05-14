"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

type Props = {
  productName: string;
  productUrl: string;
  couponCode?: string | null;
  shareTemplate?: string;
  className?: string;
};

function buildShareText(template: string | undefined, productName: string, productUrl: string, couponCode?: string | null) {
  const trimmedCoupon = couponCode?.trim() || "";
  const couponLine = trimmedCoupon ? `Use coupon code ${trimmedCoupon}.` : "";
  const base =
    template?.trim() ||
    "Hi! I found this amazing dress on Magenta Crown. Take a look: {productUrl} {couponLine}";
  return base
    .replaceAll("{productName}", productName)
    .replaceAll("{productUrl}", productUrl)
    .replaceAll("{couponCode}", trimmedCoupon)
    .replaceAll("{couponLine}", couponLine)
    .replace(/\s+/g, " ")
    .trim();
}

export function ProductShareButton({
  productName,
  productUrl,
  couponCode,
  shareTemplate,
  className = ""
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function copyLink() {
    try {
      const nav = window.navigator;
      if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(productUrl);
        if (open) {
          setModalMessage("Link copied.");
          setTimeout(() => setModalMessage(null), 1600);
        } else {
          setMessage("Link copied!");
          setTimeout(() => setMessage(null), 1600);
        }
      }
    } catch {
      /* ignore clipboard errors */
    }
  }

  function isTouchShareDevice() {
    const m = window.matchMedia("(hover: none), (pointer: coarse)");
    return m.matches;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Share this product"
        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-3 text-zinc-700 shadow-sm transition hover:border-crown-400 hover:text-crown-800"
        onClick={async () => {
          const text = buildShareText(shareTemplate, productName, productUrl, couponCode);
          const shareData = { title: productName, text, url: productUrl };
          try {
            const nav = window.navigator;
            if (typeof nav.share === "function" && isTouchShareDevice()) {
              await nav.share(shareData);
              return;
            }
            setModalMessage(null);
            setOpen(true);
          } catch {
            // Ignore user-cancelled share dialog
          }
        }}
      >
        <Share2 className="h-6 w-6" strokeWidth={1.5} />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[20000] flex items-center justify-center bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.26),rgba(0,0,0,0.7)_56%)] px-4 backdrop-blur-[3px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/55 bg-gradient-to-b from-white via-[#fff9fb] to-[#fdf4f7] p-5 shadow-[0_40px_110px_-28px_rgba(63,14,34,0.55)] ring-1 ring-white/70 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold tracking-wide text-zinc-900">Share this product</p>
            <div className="mt-3 rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2 text-xs text-zinc-700 break-all shadow-inner">
              {productUrl}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildShareText(shareTemplate, productName, productUrl, couponCode))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[54px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold leading-snug text-zinc-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 sm:flex-row sm:gap-2 sm:px-4"
              >
                <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0 text-[#25D366]" aria-hidden>
                  <path
                    d="M16 3.5c-6.9 0-12.5 5.5-12.5 12.3 0 2.4.7 4.8 2 6.8L4.1 28l5.6-1.4a12.6 12.6 0 0 0 6.3 1.7c6.9 0 12.5-5.5 12.5-12.3S22.9 3.5 16 3.5Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12.1 10.3c-.4.2-1.2 1.1-1.3 1.9-.2 1.2.3 2.5 1.4 4 .9 1.3 2.3 2.7 3.8 3.6 1.6 1 3 1.5 4.1 1.1.8-.2 1.7-1 1.9-1.5.2-.4.1-.7-.2-.9l-2.2-1c-.3-.1-.6 0-.8.2l-.8 1c-.1.2-.4.2-.6.1-.8-.4-1.8-1.2-2.6-2-.9-.8-1.6-1.8-2-2.6-.1-.2-.1-.4.1-.6l.9-.9c.2-.2.3-.5.2-.8l-1-2.2c-.1-.3-.5-.5-.9-.4Z"
                    fill="currentColor"
                  />
                </svg>
                WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[54px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold leading-snug text-zinc-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 sm:flex-row sm:gap-2 sm:px-4"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-[#2563eb]" aria-hidden>
                  <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2V8h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" />
                </svg>
                Facebook
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText(shareTemplate, productName, productUrl, couponCode))}&url=${encodeURIComponent(productUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[54px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold leading-snug text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-100 sm:flex-row sm:gap-2 sm:px-4"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-black" aria-hidden>
                  <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.3 22H3l7.2-8.3L1 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.5 3.9H4.7L17.8 20Z" />
                </svg>
                X
              </a>
              <button
                type="button"
                onClick={async () => {
                  const nav = window.navigator;
                  if (typeof nav.share === "function") {
                    await nav.share({
                      title: productName,
                      text: buildShareText(shareTemplate, productName, productUrl, couponCode),
                      url: productUrl
                    });
                    return;
                  }
                  setModalMessage("Native share is unavailable here. Use Copy link.");
                  setTimeout(() => setModalMessage(null), 2000);
                }}
                className="flex min-h-[54px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold leading-snug text-zinc-800 shadow-sm transition hover:bg-zinc-50 sm:flex-row sm:gap-2 sm:px-4"
              >
                More
              </button>
            </div>
            {modalMessage ? (
              <p className="mt-3 rounded-lg border border-zinc-200/80 bg-white/85 px-3 py-2 text-xs font-semibold text-zinc-700">
                {modalMessage}
              </p>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {message && !open ? (
        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          {message}
        </span>
      ) : null}
    </div>
  );
}

