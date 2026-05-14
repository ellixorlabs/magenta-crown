"use client";

import { ChevronUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const SHOW_AFTER_PX = 360;

/** Small FAB for shop / search catalog pages (used inside `ShopFilterSheetProvider`). */
export function ShopScrollToTopFab() {
  const [visible, setVisible] = useState(false);

  const onScroll = useCallback(() => {
    setVisible(window.scrollY > SHOW_AFTER_PX);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-5 right-5 z-[80] flex h-10 w-10 items-center justify-center rounded-full border border-mc-ink/15 bg-mc-cream/95 text-mc-ink shadow-md ring-1 ring-mc-ink/[0.06] backdrop-blur-sm transition hover:border-mc-ink/25 hover:bg-white hover:shadow-lg sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8"
    >
      <ChevronUp className="h-5 w-5" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
