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
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/55 bg-gradient-to-b from-white via-[#fff9fb] to-[#fdf4f7] p-5 shadow-[0_40px_110px_-28px_rgba(63,14,34,0.55)] ring-1 ring-white/70"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold tracking-wide text-zinc-900">Share this product</p>
            <div className="mt-3 rounded-xl border border-zinc-200/80 bg-white/80 px-3 py-2 text-xs text-zinc-700 break-all shadow-inner">
              {productUrl}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildShareText(shareTemplate, productName, productUrl, couponCode))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[54px] min-w-[96px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <svg viewBox="0 0 448 512" className="h-6 w-6 shrink-0 fill-[#22c55e]" aria-hidden>
                  <path d="M380.9 97.1C339-6.1 219.9-38.5 117.9 13.3C15.9 65.1-27.8 183.5 8.6 286.2L0 512l232.4-60.9c101.8 36.4 218.9-7.1 270.3-103.8c51.4-96.7 22-216.2-68-250.2zm-43.1 220.6c-5.4 15.1-31.8 29.3-43.8 31.2c-11.2 1.8-25.3 2.6-40.8-2.3c-9.4-3-21.5-7-37.1-13.7c-65.2-28.2-107.8-94.1-111.1-98.6c-3.3-4.4-26.5-35.3-26.5-67.4s16.8-47.9 22.8-54.5c6-6.6 13.1-8.3 17.5-8.3c4.4 0 8.8 .1 12.7 .2c4.1 .2 9.5-1.6 14.8 11.1c5.4 13.1 18.3 45.2 19.9 48.5c1.6 3.3 2.7 7.2 .5 11.6c-2.2 4.4-3.3 7.2-6.5 11.1c-3.3 3.8-6.9 8.6-9.8 11.5c-3.3 3.3-6.7 6.9-2.9 13.6c3.8 6.6 16.9 27.9 36.2 45.2c24.9 22.2 45.9 29.1 52.5 32.4c6.5 3.3 10.4 2.7 14.2-1.6c3.8-4.4 16.4-19.2 20.8-25.8c4.4-6.6 8.8-5.5 14.8-3.3c6 .2 37.9 17.9 44.4 21.2c6.5 3.3 10.9 4.9 12.5 7.7c1.6 2.7 1.6 15.9-3.8 31z" />
                </svg>
                WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[54px] min-w-[96px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
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
                className="inline-flex min-h-[54px] min-w-[96px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-100"
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
                className="min-h-[54px] min-w-[96px] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
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

