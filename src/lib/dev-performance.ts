"use client";

import { useEffect, useRef } from "react";

/** Lightweight dev-only render counter for hotspot components. */
export function useDevRenderLog(name: string, sampleEvery = 10) {
  const renders = useRef(0);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    renders.current += 1;
    if (renders.current % sampleEvery === 0) {
      console.debug(`[perf] ${name} renders:`, renders.current);
    }
  });
}

