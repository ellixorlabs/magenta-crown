"use client";

import Image from "next/image";
import { useEffect } from "react";
import { X } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

type Props = {
  open: boolean;
  imageUrl: string;
  productName: string;
  onClose: () => void;
};

export function SizeChartModal({ open, imageUrl, productName, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[24000] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close size guide"
        onClick={onClose}
      />
      <div
        className="relative z-[1] flex max-h-[min(92dvh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="size-guide-title" className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
              Size Guide
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="space-y-8 px-5 py-5 sm:px-6 sm:py-6">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 sm:p-4">
              <Image
                src={imageUrl}
                alt={`Size chart for ${productName}`}
                width={1200}
                height={1600}
                className="mx-auto h-auto w-full max-w-full object-contain"
                sizes="(max-width: 768px) 100vw, 720px"
                unoptimized
                priority
              />
            </div>

            <section className="border-t border-zinc-100 pt-6">
              <h3 className="font-[family-name:var(--font-heading)] text-xl font-medium tracking-tight text-zinc-900 sm:text-2xl">
                How to measure
              </h3>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-zinc-600">
                Use a soft tape measure directly on your body. Keep the tape level and snug but not tight, then compare
                your numbers to the chart above to choose the best size. If you fall between sizes, prefer the larger
                size for comfort or the smaller for a closer fit depending on the garment.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
