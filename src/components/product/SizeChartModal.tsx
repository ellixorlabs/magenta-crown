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
      className="fixed inset-0 z-[24000] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Size chart"
    >
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">Size chart — {productName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative max-h-[min(75vh,720px)] overflow-y-auto bg-zinc-50 p-4">
          <Image
            src={imageUrl}
            alt={`Size chart for ${productName}`}
            width={1200}
            height={1600}
            className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
