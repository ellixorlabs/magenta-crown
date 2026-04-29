"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  boundsMin: number;
  boundsMax: number;
  urlMin: string | null;
  urlMax: string | null;
  onCommit: (min: string | null, max: string | null) => void;
  /** When true, updates the URL immediately while dragging (used by the mobile filter drawer). */
  commitOnChange?: boolean;
};

export function PriceRangeSlider({
  boundsMin,
  boundsMax,
  urlMin,
  urlMax,
  onCommit,
  commitOnChange = false
}: Props) {
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

  useEffect(() => {
    const nextLo = appliedLo;
    const nextHi = clamp(appliedHi, nextLo, boundsMax);
    setLo(nextLo);
    setHi(nextHi);
  }, [appliedLo, appliedHi, boundsMax]);

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

  const step = Math.max(1, Math.round((boundsMax - boundsMin) / 200));

  const dirty = lo !== appliedLo || hi !== appliedHi;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <span>From</span>
          <span className="font-mono text-zinc-700">₹{Math.round(lo).toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={boundsMin}
          max={hi}
          step={step}
          value={lo}
          className="mt-1.5 w-full cursor-pointer accent-crown-700"
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
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <span>To</span>
          <span className="font-mono text-zinc-700">₹{Math.round(hi).toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={lo}
          max={boundsMax}
          step={step}
          value={hi}
          className="mt-1.5 w-full cursor-pointer accent-crown-700"
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
}

function clamp(n: number, a: number, b: number) {
  if (!Number.isFinite(n)) return a;
  return Math.min(b, Math.max(a, n));
}
