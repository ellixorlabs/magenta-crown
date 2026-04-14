"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

const FALLBACK =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80";

type Props = {
  name: string;
  imageUrls: string[];
  listImageIndex: number;
  listImagePosition: string;
};

export function ProductImageGallery({ name, imageUrls, listImageIndex, listImagePosition }: Props) {
  const urls = useMemo(() => (imageUrls.length > 0 ? imageUrls : [FALLBACK]), [imageUrls]);
  const initialIdx = Math.max(0, Math.min(urls.length - 1, listImageIndex));
  const [active, setActive] = useState(initialIdx);
  const [lightbox, setLightbox] = useState(false);

  const mainUrl = urls[active] ?? FALLBACK;
  const pos = listImagePosition?.trim() || "center";

  const openLb = useCallback(() => setLightbox(true), []);
  const closeLb = useCallback(() => setLightbox(false), []);

  return (
    <>
      <div>
        <button
          type="button"
          onClick={openLb}
          className="relative block w-full cursor-zoom-in overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-crown-600"
          aria-label={`View ${name} large`}
        >
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={mainUrl}
              alt={name}
              fill
              className="object-contain"
              style={{ objectPosition: pos }}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              unoptimized
            />
          </div>
        </button>

        {urls.length > 1 && (
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {urls.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-zinc-100 transition ${
                  i === active ? "border-crown-700 ring-2 ring-crown-500/30" : "border-zinc-200 hover:border-zinc-400"
                }`}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === active}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-contain"
                  style={{ objectPosition: pos }}
                  sizes="120px"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={closeLb}
          />
          <div className="relative z-[2] mx-auto flex w-full max-w-5xl flex-col gap-4">
            <div className="relative mx-auto h-[min(72dvh,680px)] w-full">
              <Image
                src={mainUrl}
                alt={name}
                fill
                className="object-contain"
                style={{ objectPosition: pos }}
                sizes="100vw"
                unoptimized
              />
            </div>
            {urls.length > 1 && (
              <div className="flex max-w-full justify-center gap-2 overflow-x-auto pb-2">
                {urls.map((url, i) => (
                  <button
                    key={`lb-${url}-${i}`}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-zinc-900 ${
                      i === active ? "border-white" : "border-zinc-600 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={url} alt="" fill className="object-contain" sizes="64px" unoptimized />
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={closeLb}
              className="mx-auto rounded-full bg-white px-6 py-2 text-sm font-semibold text-zinc-900"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
