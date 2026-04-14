"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

function parseToPercent(value: string): { x: number; y: number } {
  const v = value.trim().toLowerCase();
  if (!v || v === "center") return { x: 50, y: 50 };
  if (v === "center top") return { x: 50, y: 0 };
  if (v === "center bottom") return { x: 50, y: 100 };
  if (v === "left center" || v === "left") return { x: 0, y: 50 };
  if (v === "right center" || v === "right") return { x: 100, y: 50 };
  if (v === "top") return { x: 50, y: 0 };
  if (v === "bottom") return { x: 50, y: 100 };
  const m = v.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (m) return { x: Number(m[1]), y: Number(m[2]) };
  return { x: 50, y: 50 };
}

function toCss(x: number, y: number) {
  const rx = Math.round(x * 10) / 10;
  const ry = Math.round(y * 10) / 10;
  return `${rx}% ${ry}%`;
}

export type PreviewOrientation = "portrait" | "landscape";

type Props = {
  src: string | null | undefined;
  value: string;
  onChange: (css: string) => void;
  fit: "cover" | "contain";
  className?: string;
  label?: string;
  /** Initial preview frame; use buttons to switch without persisting (preview only). */
  defaultOrientation?: PreviewOrientation;
};

/**
 * Click or drag on the preview to set CSS object-position (focal point).
 * Semi-transparent box shows the center point.
 */
export function ImageFocusPicker({
  src,
  value,
  onChange,
  fit,
  className,
  label,
  defaultOrientation = "portrait"
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [orientation, setOrientation] = useState<PreviewOrientation>(defaultOrientation);
  const [pos, setPos] = useState(() => parseToPercent(value));

  useEffect(() => {
    setPos(parseToPercent(value));
  }, [value]);

  const commit = useCallback(
    (x: number, y: number) => {
      const nx = Math.min(100, Math.max(0, x));
      const ny = Math.min(100, Math.max(0, y));
      setPos({ x: nx, y: ny });
      onChange(toCss(nx, ny));
    },
    [onChange]
  );

  const updateFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * 100;
      const y = ((clientY - r.top) / r.height) * 100;
      commit(x, y);
    },
    [commit]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    updateFromClient(e.clientX, e.clientY);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClient(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  if (!src) {
    return (
      <div className={`rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-xs text-zinc-500 ${className ?? ""}`}>
        Add an image URL to set focus
      </div>
    );
  }

  const objectPos = toCss(pos.x, pos.y);

  const frameClass =
    orientation === "portrait"
      ? "aspect-[3/4] max-h-[320px]"
      : "aspect-video max-h-[min(360px,50vh)] w-full";

  const previewSizes =
    orientation === "portrait"
      ? "(max-width: 768px) 100vw, 400px"
      : "(max-width: 768px) 100vw, min(720px, 90vw)";

  return (
    <div className={className}>
      {label ? <p className="mb-2 text-xs font-semibold text-zinc-600">{label}</p> : null}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Preview frame:</span>
        <div className="inline-flex rounded-full border border-zinc-300 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setOrientation("portrait")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              orientation === "portrait" ? "bg-crown-800 text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Portrait
          </button>
          <button
            type="button"
            onClick={() => setOrientation("landscape")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              orientation === "landscape" ? "bg-crown-800 text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Landscape
          </button>
        </div>
      </div>
      <p className="mb-2 text-xs text-zinc-500">
        Click or drag inside the preview to move the focal point (transparent overlay). Switch frame to match your
        photo orientation.
      </p>
      <div
        ref={containerRef}
        className={`relative w-full cursor-crosshair overflow-hidden rounded-xl border border-zinc-300 bg-zinc-200 touch-none select-none ${frameClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <Image
          src={src}
          alt=""
          fill
          className={fit === "cover" ? "object-cover" : "object-contain"}
          style={{ objectPosition: objectPos }}
          sizes={previewSizes}
          unoptimized
        />
        <div
          className="pointer-events-none absolute h-[22%] min-h-[44px] w-[22%] min-w-[44px] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white/80 bg-white/25 shadow-md"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          aria-hidden
        />
      </div>
      <p className="mt-2 font-mono text-[10px] text-zinc-500">{objectPos}</p>
    </div>
  );
}
