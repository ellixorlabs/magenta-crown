"use client";

import { useLayoutEffect, useState, type CSSProperties } from "react";

export const MC_LOADER_Z_INTRO = 2147483000;
/** Below intro overlay so home handoff can stack; still above site chrome (~5000). */
export const MC_LOADER_Z_ROUTE = 2147482900;

/**
 * Mobile Safari often sizes `position:fixed` + `100dvh`/`inset:0` to the *layout* viewport while the
 * paintable area follows `visualViewport`. Syncing to `visualViewport` removes the “half maroon / half white” seam.
 */
export function useMcLoaderFixedBox(active: boolean, zIndex: number = MC_LOADER_Z_INTRO): CSSProperties {
  const [box, setBox] = useState<CSSProperties>(() => ({
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    minHeight: "100vh",
    boxSizing: "border-box",
    zIndex: zIndex,
    maxWidth: "none"
  }));

  useLayoutEffect(() => {
    if (!active) return;

    const sync = () => {
      const vv = window.visualViewport;
      if (vv) {
        setBox((prev) => {
          const next: CSSProperties = {
            position: "fixed",
            top: vv.offsetTop,
            left: vv.offsetLeft,
            width: vv.width,
            height: vv.height,
            minHeight: vv.height,
            maxHeight: vv.height,
            boxSizing: "border-box",
            zIndex: zIndex,
            maxWidth: "none"
          };
          if (
            prev.top === next.top &&
            prev.left === next.left &&
            prev.width === next.width &&
            prev.height === next.height
          ) {
            return prev;
          }
          return next;
        });
        return;
      }
      const h = window.innerHeight;
      setBox((prev) => {
        const next: CSSProperties = {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: h,
          minHeight: h,
          maxHeight: h,
          boxSizing: "border-box",
          zIndex: zIndex,
          maxWidth: "none"
        };
        if (prev.height === next.height && prev.width === next.width) return prev;
        return next;
      });
    };

    sync();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [active, zIndex]);

  return box;
}
