"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type MediaItem = { id: string; type: string; url: string; thumbnailUrl: string | null };

export function ReviewMediaPreviewModal({
  media,
  startIndex = 0,
  onClose
}: {
  media: MediaItem[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const item = media[index];

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(media.length - 1, i + 1));
    },
    [media.length, onClose]
  );

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onKey]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white"
        >
          Close
        </button>
        <MediaViewport item={item} />
        {media.length > 1 ? (
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-300">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="disabled:opacity-40"
            >
              ← Previous
            </button>
            <span>
              {index + 1} / {media.length}
            </span>
            <button
              type="button"
              disabled={index >= media.length - 1}
              onClick={() => setIndex((i) => Math.min(media.length - 1, i + 1))}
              className="disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MediaViewport({ item }: { item: MediaItem }) {
  return (
    <div className="relative flex min-h-[240px] items-center justify-center bg-black p-4 pt-12">
      {item.type === "IMAGE" ? (
        <PreviewImage url={item.url} />
      ) : (
        <video src={item.url} className="max-h-[70vh] max-w-full" controls playsInline autoPlay />
      )}
    </div>
  );
}

function PreviewImage({ url }: { url: string }) {
  return (
    <div className="relative h-[min(70vh,520px)] w-full">
      <Image src={url} alt="" fill className="object-contain" sizes="(max-width:768px) 100vw, 768px" unoptimized />
    </div>
  );
}
