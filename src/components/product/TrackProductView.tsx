"use client";

import { useEffect } from "react";

const KEY = "magenta-crown-recent";

export function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const prev = (raw ? JSON.parse(raw) : []) as string[];
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 10);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [productId]);

  return null;
}
