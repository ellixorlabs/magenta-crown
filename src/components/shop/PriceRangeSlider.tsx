"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";

export type PriceRangeSliderHandle = {
  /** Push current min/max to URL if they differ from applied URL params. */
  flush: () => void;
  /** Current thumbs as URL param strings (for batch Apply without waiting for React state). */
  peekDraftCommit: () => { min: string | null; max: string | null };
};

type Props = {
  boundsMin: number;
  boundsMax: number;
  urlMin: string | null;
  urlMax: string | null;
  onCommit: (min: string | null, max: string | null) => void;
  /** When true, updates the URL immediately while dragging. */
  commitOnChange?: boolean;
  /** Compact layout: min and max thumbs on one shared track (e.g. mobile filter sheet). */
  singleHandle?: boolean;
};

const thumbPointer =
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-950 [&::-webkit-slider-thumb]:bg-zinc-950 [&::-webkit-slider-thumb]:shadow-md " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-zinc-950 [&::-moz-range-thumb]:bg-zinc-950 [&::-moz-range-thumb]:shadow-md";

export const PriceRangeSlider = forwardRef<PriceRangeSliderHandle, Props>(function PriceRangeSlider(
  { boundsMin, boundsMax, urlMin, urlMax, onCommit, commitOnChange = false, singleHandle = false },
  ref
) {
  const appliedLo = useMemo(() => {
    if (urlMin != null && urlMin !== "" && !Number.isNaN(Number(urlMin))) {
      return clamp(Number(urlMin), boundsMin, boundsMax);
    }
    return boundsMin;
  }, [urlMin, boundsMin, boundsMax]);

  const appliedHi = useMemo(() => {
    if (urlMax != null && urlMax !== "" && !Number.isNaN(Number(urlMax))) {
      return clamp(Number(urlMax), boundsMin, boundsMax);
    }
    return boundsMax;
  }, [urlMax, boundsMin, boundsMax]);

  const [lo, setLo] = useState(appliedLo);
  const [hi, setHi] = useState(appliedHi);
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);

  useEffect(() => {
    const nextLo = appliedLo;
    const nextHi = clamp(appliedHi, nextLo, boundsMax);
    setLo(nextLo);
    setHi(nextHi);
  }, [appliedLo, appliedHi, boundsMax]);

  useEffect(() => {
    setActiveThumb(null);
  }, [appliedLo, appliedHi]);

  const commit = useCallback(
    (a: number, b: number) => {
      const x = Math.min(a, b);
      const y = Math.max(a, b);
      const atMin = x <= boundsMin;
      const atMax = y >= boundsMax;
      onCommit(
        atMin ? null : String(Math.round(x)),
        atMax ? null : String(Math.round(y))
      );
    },
    [boundsMin, boundsMax, onCommit]
  );

  const peekDraftCommit = useCallback(() => {
    const x = Math.min(lo, hi);
    const y = Math.max(lo, hi);
    const atMin = x <= boundsMin;
    const atMax = y >= boundsMax;
    return {
      min: atMin ? null : String(Math.round(x)),
      max: atMax ? null : String(Math.round(y))
    };
  }, [lo, hi, boundsMin, boundsMax]);

  const step = Math.max(1, Math.round((boundsMax - boundsMin) / 200));

  const dirty = lo !== appliedLo || hi !== appliedHi;

  useImperativeHandle(
    ref,
    () => ({
      flush: () => {
        if (lo !== appliedLo || hi !== appliedHi) {
          commit(lo, hi);
        }
      },
      peekDraftCommit
    }),
    [lo, hi, appliedLo, appliedHi, commit, peekDraftCommit]
  );

  if (singleHandle) {
    const minPct = ((lo - boundsMin) / Math.max(1, boundsMax - boundsMin)) * 100;
    const maxPct = ((hi - boundsMin) / Math.max(1, boundsMax - boundsMin)) * 100;
    return (
      <div className="space-y-4">
        <div className="flex justify-between text-sm font-semibold tracking-wide text-zinc-600 sm:text-base">
          <span className="font-mono tabular-nums text-zinc-900">₹{Math.round(lo).toLocaleString()}</span>
          <span className="font-mono tabular-nums text-zinc-900">₹{Math.round(hi).toLocaleString()}</span>
        </div>
        <div className="relative h-10 touch-pan-y">
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-zinc-200" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-crown-700"
            style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          />
          <input
            type="range"
            min={boundsMin}
            max={boundsMax}
            step={step}
            value={lo}
            className={`pointer-events-none absolute inset-0 ${activeThumb === "min" ? "z-30" : "z-10"} w-full appearance-none bg-transparent ${thumbPointer}`}
            aria-label="Minimum price"
            onPointerDown={() => setActiveThumb("min")}
            onPointerUp={() => setActiveThumb(null)}
            onChange={(e) => {
              const v = Number(e.target.value);
              const nextLo = clamp(v, boundsMin, hi);
              setLo(nextLo);
              if (commitOnChange) commit(nextLo, hi);
            }}
          />
          <input
            type="range"
            min={boundsMin}
            max={boundsMax}
            step={step}
            value={hi}
            className={`pointer-events-none absolute inset-0 ${activeThumb === "max" ? "z-30" : "z-20"} w-full appearance-none bg-transparent ${thumbPointer}`}
            aria-label="Maximum price"
            onPointerDown={() => setActiveThumb("max")}
            onPointerUp={() => setActiveThumb(null)}
            onChange={(e) => {
              const v = Number(e.target.value);
              const nextHi = clamp(v, lo, boundsMax);
              setHi(nextHi);
              if (commitOnChange) commit(lo, nextHi);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm font-semibold uppercase tracking-wider text-zinc-500 sm:text-base">
          <span>From</span>
          <span className="font-mono tabular-nums text-zinc-900">₹{Math.round(lo).toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={boundsMin}
          max={hi}
          step={step}
          value={lo}
          className="mt-1.5 w-full cursor-pointer accent-zinc-950"
          aria-label="Minimum price"
          onChange={(e) => {
            const v = Number(e.target.value);
            const nextLo = clamp(v, boundsMin, hi);
            setLo(nextLo);
            if (commitOnChange) commit(nextLo, hi);
          }}
        />
      </div>
      <div>
        <div className="flex justify-between text-sm font-semibold uppercase tracking-wider text-zinc-500 sm:text-base">
          <span>To</span>
          <span className="font-mono tabular-nums text-zinc-900">₹{Math.round(hi).toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={lo}
          max={boundsMax}
          step={step}
          value={hi}
          className="mt-1.5 w-full cursor-pointer accent-zinc-950"
          aria-label="Maximum price"
          onChange={(e) => {
            const v = Number(e.target.value);
            const nextHi = clamp(v, lo, boundsMax);
            setHi(nextHi);
            if (commitOnChange) commit(lo, nextHi);
          }}
        />
      </div>
      <button
        type="button"
        disabled={!dirty}
        onClick={() => commit(lo, hi)}
        className={[
          "w-full rounded-full py-2.5 text-sm font-semibold transition",
          commitOnChange ? "hidden" : "bg-zinc-900 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        ].join(" ")}
      >
        Apply price filter
      </button>
    </div>
  );
});

function clamp(n: number, a: number, b: number) {
  if (!Number.isFinite(n)) return a;
  return Math.min(b, Math.max(a, n));
}
