"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { normalizeAdminImageUrl } from "@/lib/admin-image-url";

function parseUrls(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type Props = {
  defaultUrlsText: string;
  defaultVideoUrlsText?: string;
  defaultListImageIndex: number;
  defaultListImagePosition: string;
  productId?: string;
  textareaName?: string;
  videoTextareaName?: string;
};

export function AdminProductImageFields({
  defaultUrlsText,
  defaultVideoUrlsText = "",
  defaultListImageIndex,
  defaultListImagePosition,
  productId,
  textareaName = "imageUrls",
  videoTextareaName = "videoUrls"
}: Props) {
  const [urls, setUrls] = useState<string[]>(() => parseUrls(defaultUrlsText).map(normalizeAdminImageUrl));
  const [videoUrls, setVideoUrls] = useState<string[]>(() => parseUrls(defaultVideoUrlsText));
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [idx, setIdx] = useState(() =>
    Math.max(0, Math.min(Math.max(0, urls.length - 1), defaultListImageIndex))
  );
  const effectivePosition = defaultListImagePosition || "center";
  const previewUrl = urls.length > 0 ? urls[Math.min(idx, urls.length - 1)] : null;

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      try {
        const appendedImages: string[] = [];
        const appendedVideos: string[] = [];
        for (const f of files) {
          if (f.type.startsWith("video/")) {
            if (f.type !== "video/mp4") {
              throw new Error(`Unsupported video type: ${f.name}. Use MP4 only.`);
            }
            if (f.size > 20 * 1024 * 1024) {
              throw new Error(`${f.name} is larger than 20MB.`);
            }
            const fd = new FormData();
            fd.append("file", f);
            if (productId) fd.append("productId", productId);
            const res = await fetch("/api/admin/product-video", { method: "POST", body: fd });
            const data = (await res.json()) as { url?: string; error?: string };
            if (!res.ok) throw new Error(data.error ?? "Upload failed");
            if (data.url) appendedVideos.push(data.url);
            continue;
          }

          if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
            throw new Error(`Unsupported image type: ${f.name}. Use JPEG, PNG, or WEBP.`);
          }
          if (f.size > 2 * 1024 * 1024) {
            throw new Error(`${f.name} is larger than 2MB.`);
          }
          const fd = new FormData();
          fd.append("file", f);
          if (productId) fd.append("productId", productId);
          const res = await fetch("/api/admin/product-image", { method: "POST", body: fd });
          const data = (await res.json()) as { url?: string; error?: string };
          if (!res.ok) throw new Error(data.error ?? "Upload failed");
          if (data.url) appendedImages.push(data.url);
        }
        if (appendedImages.length) {
          setUrls((prev) => {
            const next = [...prev, ...appendedImages];
            setIdx((cur) => Math.min(cur, Math.max(0, next.length - 1)));
            return next;
          });
        }
        if (appendedVideos.length) {
          setVideoUrls((prev) => [...prev, ...appendedVideos]);
        }
      } finally {
        setUploading(false);
      }
    },
    [productId]
  );

  const removeAt = useCallback((i: number) => {
    setUrls((prev) => {
      const next = prev.filter((_, j) => j !== i);
      setIdx((cur) => Math.max(0, Math.min(cur, Math.max(0, next.length - 1))));
      return next;
    });
  }, []);
  const removeVideoAt = useCallback((i: number) => {
    setVideoUrls((prev) => prev.filter((_, j) => j !== i));
  }, []);

  return (
    <div className="space-y-6 sm:col-span-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-zinc-900">Product images</h4>
          <p className="mt-1 text-xs text-zinc-500">
            Drag/drop or choose media from your system. Images go to <span className="font-mono">products-images</span>{" "}
            (max 2MB), videos go to <span className="font-mono">products-videos</span> (MP4, max 20MB).
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              {previewUrl ? (
                <div className="relative aspect-[3/4] w-full">
                  <Image
                    src={previewUrl}
                    alt="Selected product preview"
                    fill
                    sizes="260px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center px-4 text-center text-xs text-zinc-400">
                  Upload images to preview.
                </div>
              )}
            </div>
            {urls.length > 0 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {urls.map((u, i) => (
                  <div key={`${u}-${i}`} className="relative">
                    <button
                      type="button"
                      onClick={() => setIdx(i)}
                      className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-md border-2 ${
                        i === Math.min(idx, urls.length - 1)
                          ? "border-crown-700 ring-2 ring-crown-500/30"
                          : "border-zinc-200"
                      }`}
                    >
                      <Image src={u} alt="" fill sizes="56px" className="object-cover" unoptimized />
                    </button>
                    <button
                      type="button"
                      className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-red-700 text-[10px] font-bold text-white shadow hover:bg-red-800"
                      onClick={() => removeAt(i)}
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!uploading) setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (uploading) return;
                void uploadFiles(Array.from(e.dataTransfer.files ?? []));
              }}
              className={`rounded-xl border-2 border-dashed p-5 text-sm transition ${
                dragActive ? "border-crown-500 bg-crown-50/60" : "border-zinc-300 bg-zinc-50"
              }`}
            >
              <p className="font-medium text-zinc-800">Drop images here</p>
              <p className="mt-1 text-xs text-zinc-500">JPEG/PNG/WEBP (max 2MB) or MP4 video (max 20MB)</p>
              <label className="mt-3 inline-block cursor-pointer rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  className="sr-only"
                  disabled={uploading}
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) {
                      try {
                        await uploadFiles(files);
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "Upload failed");
                      }
                    }
                    e.target.value = "";
                  }}
                />
                {uploading ? "Uploading…" : "Choose files"}
              </label>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
              {urls.length > 0 || videoUrls.length > 0
                ? `${urls.length} image(s), ${videoUrls.length} video(s) uploaded`
                : "No media uploaded yet."}
            </div>

            <input type="hidden" name={textareaName} value={urls.join("\n")} />
            <input type="hidden" name={videoTextareaName} value={videoUrls.join("\n")} />
            <input type="hidden" name="listImageIndex" value={String(Math.min(idx, Math.max(0, urls.length - 1)))} />
            <input type="hidden" name="listImagePosition" value={effectivePosition} />
            {videoUrls.length > 0 ? (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-2">
                <p className="mb-2 text-xs font-semibold text-zinc-600">Uploaded videos</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {videoUrls.map((url, i) => (
                    <div key={`${url}-${i}`} className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                      <video
                        src={url}
                        className="aspect-video w-full bg-black"
                        preload="metadata"
                        muted
                        controls
                        controlsList="nodownload nofullscreen noremoteplayback"
                        disablePictureInPicture
                        playsInline
                        onContextMenu={(e) => e.preventDefault()}
                      />
                      <div className="flex items-center justify-between px-2 py-1">
                        <p className="truncate text-[11px] text-zinc-600">#{i + 1}</p>
                        <button
                          type="button"
                          className="rounded bg-red-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-800"
                          onClick={() => removeVideoAt(i)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
