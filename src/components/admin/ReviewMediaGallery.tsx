"use client";

import Image from "next/image";
import { useState } from "react";
import { ReviewMediaPreviewModal } from "@/components/admin/ReviewMediaPreviewModal";

type MediaItem = { id: string; type: string; url: string; thumbnailUrl: string | null };

export function ReviewMediaGallery({
  reviewId,
  media,
  deleteFormAction
}: {
  reviewId: string;
  media: MediaItem[];
  deleteFormAction: (formData: FormData) => Promise<void>;
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Media</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {media.map((m, i) => (
          <div key={m.id} className="relative">
            <button
              type="button"
              onClick={() => setPreviewIndex(i)}
              className="relative block h-20 w-20 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50 ring-offset-2 hover:ring-2 hover:ring-crown-800/30"
            >
              {m.type === "IMAGE" ? (
                <Image src={m.thumbnailUrl || m.url} alt="" fill className="object-cover" sizes="80px" unoptimized />
              ) : (
                <video src={m.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              )}
            </button>
            <form action={deleteFormAction} className="absolute right-0.5 top-0.5">
              <input type="hidden" name="reviewId" value={reviewId} />
              <input type="hidden" name="mediaId" value={m.id} />
              <button
                type="submit"
                className="rounded bg-black/70 px-1.5 text-[10px] font-bold text-white"
                title="Delete media"
              >
                ×
              </button>
            </form>
          </div>
        ))}
      </div>
      {previewIndex != null ? (
        <ReviewMediaPreviewModal media={media} startIndex={previewIndex} onClose={() => setPreviewIndex(null)} />
      ) : null}
    </div>
  );
}
