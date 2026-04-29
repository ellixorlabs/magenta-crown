"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

type Props = {
  productName: string;
  productUrl: string;
  className?: string;
};

export function ProductShareButton({ productName, productUrl, className = "" }: Props) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Share this product"
        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-3 text-zinc-700 shadow-sm transition hover:border-crown-400 hover:text-crown-800"
        onClick={async () => {
          const text = "Check out this product I found on Magenta Crown — looks amazing! ✨";
          const shareData = { title: productName, text, url: productUrl };

          try {
            const nav = window.navigator;
            if (typeof nav.share === "function") {
              await nav.share(shareData);
              return;
            }

            if (nav.clipboard?.writeText) {
              await nav.clipboard.writeText(productUrl);
            } else {
              throw new Error("Clipboard unavailable");
            }
            setMessage("Link copied!");
            setTimeout(() => setMessage(null), 1600);
          } catch {
            // Ignore user-cancelled native share dialog or clipboard blocks.
          }
        }}
      >
        <Share2 className="h-6 w-6" strokeWidth={1.5} />
      </button>
      {message ? (
        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          {message}
        </span>
      ) : null}
    </div>
  );
}

