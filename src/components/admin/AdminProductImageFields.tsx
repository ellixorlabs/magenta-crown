"use client";

import { useMemo, useState } from "react";
import { ImageFocusPicker } from "@/components/admin/ImageFocusPicker";
import { normalizeAdminImageUrl } from "@/lib/admin-image-url";

function parseUrls(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const POSITION_PRESETS = [
  { value: "center", label: "Center" },
  { value: "center top", label: "Top" },
  { value: "center bottom", label: "Bottom" },
  { value: "left center", label: "Left" },
  { value: "right center", label: "Right" }
];

type Props = {
  defaultUrlsText: string;
  defaultListImageIndex: number;
  defaultListImagePosition: string;
  productId?: string;
  textareaName?: string;
};

export function AdminProductImageFields({
  defaultUrlsText,
  defaultListImageIndex,
  defaultListImagePosition,
  productId,
  textareaName = "imageUrls"
}: Props) {
  const [text, setText] = useState(defaultUrlsText);
  const [uploading, setUploading] = useState(false);
  const urls = useMemo(() => parseUrls(text).map(normalizeAdminImageUrl), [text]);
  const [idx, setIdx] = useState(() =>
    Math.max(0, Math.min(Math.max(0, urls.length - 1), defaultListImageIndex))
  );
  const [positionMode, setPositionMode] = useState<"preset" | "custom">(
    POSITION_PRESETS.some((p) => p.value === defaultListImagePosition) ? "preset" : "custom"
  );
  const [preset, setPreset] = useState(
    POSITION_PRESETS.find((p) => p.value === defaultListImagePosition)?.value ?? "center"
  );
  const [customPos, setCustomPos] = useState(
    POSITION_PRESETS.some((p) => p.value === defaultListImagePosition)
      ? "50% 40%"
      : defaultListImagePosition || "center"
  );

  const effectivePosition = positionMode === "preset" ? preset : customPos;
  const previewUrl = urls.length > 0 ? urls[Math.min(idx, urls.length - 1)] : null;

  return (
    <div className="space-y-6 sm:col-span-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Product images</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Upload JPEG/PNG (auto-compressed to WebP and stored in Supabase bucket{" "}
              <span className="font-mono">product-images</span>).
            </p>
          </div>
          <label className="cursor-pointer rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
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
                    const res = await fetch("/api/admin/product-image", { method: "POST", body: fd });
                    const data = (await res.json()) as { url?: string; error?: string };
                    if (!res.ok) throw new Error(data.error ?? "Upload failed");
                    if (data.url) appended.push(data.url);
                  }
                  if (appended.length) {
                    setText((t) => {
                      const base = t.trim();
                      const next = base ? `${base}\n${appended.join("\n")}` : appended.join("\n");
                      const nextUrls = parseUrls(next);
                      setIdx((i) => Math.min(i, Math.max(0, nextUrls.length - 1)));
                      return next;
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
            {uploading ? "Uploading…" : "Upload images"}
          </label>
        </div>
        {urls.length > 0 ? (
          <div className="mt-4 flex gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:thin]">
            {urls.map((u, i) => (
              <div key={`${u}-${i}`} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`block h-24 w-20 overflow-hidden rounded-lg border-2 transition ${
                    i === Math.min(idx, urls.length - 1)
                      ? "border-crown-700 ring-2 ring-crown-500/30"
                      : "border-zinc-200"
                  }`}
                >
                  {/* Native img: admin pastes arbitrary hosts; next/image can block or hang on unknown remotes. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
                <button
                  type="button"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-700 text-xs font-bold text-white shadow hover:bg-red-800"
                  onClick={() => {
                    setText((t) => {
                      const nextUrls = parseUrls(t).map(normalizeAdminImageUrl).filter((_, j) => j !== i);
                      setIdx((cur) => Math.max(0, Math.min(cur, Math.max(0, nextUrls.length - 1))));
                      return nextUrls.join("\n");
                    });
                  }}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-zinc-400">No images yet — upload product images.</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
        <h4 className="text-sm font-semibold text-zinc-900">Storefront preview image</h4>
        <p className="mt-1 text-xs text-zinc-600">
          Choose which URL is the list/PDP default and refine framing (object-position).
        </p>
        <input type="hidden" name="listImageIndex" value={String(Math.min(idx, Math.max(0, urls.length - 1)))} />
        <input type="hidden" name="listImagePosition" value={effectivePosition} />

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-zinc-600">Preview image (index)</label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={Math.min(idx, Math.max(0, urls.length - 1))}
              onChange={(e) => setIdx(Number(e.target.value))}
              disabled={urls.length === 0}
            >
              {urls.length === 0 ? (
                <option value={0}>No images</option>
              ) : (
                urls.map((u, i) => (
                  <option key={i} value={i}>
                    #{i + 1} — {u.slice(0, 48)}
                    {u.length > 48 ? "…" : ""}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600">Position mode</label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={positionMode}
              onChange={(e) => setPositionMode(e.target.value as "preset" | "custom")}
            >
              <option value="preset">Preset</option>
              <option value="custom">Custom (CSS)</option>
            </select>
          </div>
        </div>

        {positionMode === "preset" ? (
          <div className="mt-3">
            <label className="text-xs font-semibold text-zinc-600">Framing preset</label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              {POSITION_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-3">
            <label className="text-xs font-semibold text-zinc-600">Custom object-position</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
              value={customPos}
              onChange={(e) => setCustomPos(e.target.value)}
              placeholder="e.g. 50% 30% or center top"
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <input type="hidden" name={textareaName} value={text} />
        <div>
          <label className="text-xs font-semibold text-zinc-600">Uploaded images</label>
          <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500">
            {urls.length > 0 ? `${urls.length} image(s) uploaded` : "Upload at least one image to continue."}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-600">Preview &amp; focus</p>
          <div className="mt-1">
            {previewUrl ? (
              <ImageFocusPicker
                src={previewUrl}
                value={effectivePosition}
                onChange={(css) => {
                  setPositionMode("custom");
                  setCustomPos(css);
                }}
                fit="contain"
                label="Drag inside the frame to center the subject (applies to cards, PDP, cart thumb)."
              />
            ) : (
              <div className="flex aspect-[3/4] max-h-[280px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400">
                Paste image URLs above
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
