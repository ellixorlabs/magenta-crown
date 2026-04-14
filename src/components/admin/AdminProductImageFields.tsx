"use client";

import { useMemo, useState } from "react";
import { ImageFocusPicker } from "@/components/admin/ImageFocusPicker";

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
  textareaName?: string;
};

export function AdminProductImageFields({
  defaultUrlsText,
  defaultListImageIndex,
  defaultListImagePosition,
  textareaName = "imageUrls"
}: Props) {
  const [text, setText] = useState(defaultUrlsText);
  const urls = useMemo(() => parseUrls(text), [text]);
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
        <div>
          <label className="text-xs font-semibold text-zinc-600">Image URLs (one per line or commas)</label>
          <textarea
            name={textareaName}
            required
            rows={4}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const next = parseUrls(e.target.value);
              setIdx((i) => Math.min(i, Math.max(0, next.length - 1)));
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono text-xs"
          />
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
