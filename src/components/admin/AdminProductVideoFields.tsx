"use client";

import { useMemo, useState } from "react";

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
  const [text, setText] = useState(defaultUrlsText);
  const [uploading, setUploading] = useState(false);
  const urls = useMemo(() => parseUrls(text), [text]);

  return (
    <div className="space-y-4 sm:col-span-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Product videos</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Upload MP4 (max 20MB) to Supabase Storage, or paste existing public URLs.
            </p>
          </div>

          <label className="cursor-pointer rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100">
            <input
              type="file"
              accept="video/mp4"
              className="sr-only"
              disabled={uploading}
              multiple
              onChange={async (e) => {
                const files = e.target.files;
                if (!files?.length) return;
                setUploading(true);
                try {
                  const appended: string[] = [];
                  for (const f of Array.from(files)) {
                    const fd = new FormData();
                    fd.append("file", f);
                    if (productId) fd.append("productId", productId);
                    const res = await fetch("/api/admin/product-video", { method: "POST", body: fd });
                    const data = (await res.json()) as { url?: string; error?: string };
                    if (!res.ok) throw new Error(data.error ?? "Upload failed");
                    if (data.url) appended.push(data.url);
                  }

                  if (appended.length) {
                    setText((t) => {
                      const base = t.trim();
                      return base ? `${base}\n${appended.join("\n")}` : appended.join("\n");
                    });
                  }
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
            {uploading ? "Uploading…" : "Upload videos"}
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
                <p className="truncate px-2 py-1 text-[11px] text-zinc-600">#{i + 1}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-zinc-400">No videos yet.</p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-600">Video URLs (one per line or commas)</label>
        <textarea
          name={textareaName}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
        />
      </div>
    </div>
  );
}

