"use client";

import { useCallback, useState } from "react";

function parseUrls(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type Props = {
  defaultUrlsText: string;
  productId?: string;
  textareaName?: string;
};

export function AdminProductVideoFields({
  defaultUrlsText,
  productId,
  textareaName = "videoUrls"
}: Props) {
  const [urls, setUrls] = useState<string[]>(() => parseUrls(defaultUrlsText));
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      try {
        const appended: string[] = [];
        for (const f of files) {
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
          if (data.url) appended.push(data.url);
        }
        if (appended.length) {
          setUrls((prev) => [...prev, ...appended]);
        }
      } finally {
        setUploading(false);
      }
    },
    [productId]
  );

  const removeAt = useCallback((i: number) => {
    setUrls((prev) => prev.filter((_, j) => j !== i));
  }, []);

  return (
    <div className="space-y-4 sm:col-span-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Product videos</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Drag/drop or choose MP4 videos from your system. Files upload to{" "}
              <span className="font-mono">products-videos</span> (max 20MB each).
            </p>
          </div>
        </div>

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
          className={`mt-3 rounded-xl border-2 border-dashed p-5 text-sm transition ${
            dragActive ? "border-crown-500 bg-crown-50/60" : "border-zinc-300 bg-zinc-50"
          }`}
        >
          <p className="font-medium text-zinc-800">Drop videos here</p>
          <p className="mt-1 text-xs text-zinc-500">MP4 only · max 20MB each</p>
          <label className="mt-3 inline-block cursor-pointer rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50">
            <input
              type="file"
              accept="video/mp4"
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

        {urls.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {urls.map((url, i) => (
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
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <p className="truncate text-[11px] text-zinc-600">#{i + 1}</p>
                  <button
                    type="button"
                    className="rounded bg-red-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-800"
                    onClick={() => removeAt(i)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-zinc-400">No videos yet.</p>
        )}
      </div>
      <input type="hidden" name={textareaName} value={urls.join("\n")} />
    </div>
  );
}

