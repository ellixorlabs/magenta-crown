"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

const FALLBACK = "/branding/mc-loader-logo.png";

type ImgBounds = { ox: number; oy: number; w: number; h: number };
type LensRect = { left: number; top: number; size: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type Props = {
  name: string;
  /** SEO / a11y: product name + category (and optional details). Defaults to `name`. */
  imageAlt?: string;
  imageUrls: string[];
  listImageIndex: number;
  listImagePosition: string;
};

export function ProductImageGallery({ name, imageAlt, imageUrls, listImageIndex, listImagePosition }: Props) {
  const altLabel = imageAlt?.trim() || name;
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const urls = useMemo(() => {
    const source = imageUrls.length > 0 ? imageUrls : [FALLBACK];
    return source.map((url) => (failedUrls.has(url) ? FALLBACK : url));
  }, [failedUrls, imageUrls]);
  const initialIdx = Math.max(0, Math.min(urls.length - 1, listImageIndex));
  const [active, setActive] = useState(initialIdx);
  const [lightbox, setLightbox] = useState(false);
  const [mounted, setMounted] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const zoomPanelRef = useRef<HTMLDivElement>(null);

  const [isLg, setIsLg] = useState(false);
  const [imgBounds, setImgBounds] = useState<ImgBounds | null>(null);
  const [pointerInMain, setPointerInMain] = useState(false);
  const [lens, setLens] = useState<LensRect | null>(null);
  /** Bumps when the zoom panel is measured so the magnified image can read clientWidth. */
  const [zoomLayoutTick, setZoomLayoutTick] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const moveRaf = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const mainUrl = urls[active] ?? FALLBACK;
  const pos = listImagePosition?.trim() || "center";

  const updateBounds = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const img = imgRef.current ?? stage.querySelector("img");
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const sr = stage.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    if (ir.width < 2 || ir.height < 2) return;
    setImgBounds({
      ox: ir.left - sr.left,
      oy: ir.top - sr.top,
      w: ir.width,
      h: ir.height
    });
  }, []);

  useLayoutEffect(() => {
    updateBounds();
  }, [active, mainUrl, pos, updateBounds]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => updateBounds());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [updateBounds]);

  useEffect(() => {
    const zoom = zoomPanelRef.current;
    if (!zoom) return;
    const ro = new ResizeObserver(() => setZoomLayoutTick((t) => t + 1));
    ro.observe(zoom);
    return () => ro.disconnect();
  }, []);

  const openLb = useCallback(() => setLightbox(true), []);
  const closeLb = useCallback(() => setLightbox(false), []);

  const goPrev = useCallback(() => {
    setActive((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goNext = useCallback(() => {
    setActive((i) => (i + 1) % urls.length);
  }, [urls.length]);

  const markUrlFailed = useCallback((url: string) => {
    if (!url || url === FALLBACK) return;
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!isLg || !imgBounds || !stageRef.current) {
        setLens(null);
        return;
      }
      const stage = stageRef.current;
      const rect = stage.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const { ox, oy, w, h } = imgBounds;
      if (x < ox || x > ox + w || y < oy || y > oy + h) {
        setLens(null);
        return;
      }
      const size = clamp(Math.round(Math.min(w, h) * 0.22), 72, 160);
      const cx = clamp(x, ox + size / 2, ox + w - size / 2);
      const cy = clamp(y, oy + size / 2, oy + h - size / 2);
      setLens({ left: cx - size / 2, top: cy - size / 2, size });
    },
    [imgBounds, isLg]
  );

  const handleMainPointerMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (moveRaf.current != null) cancelAnimationFrame(moveRaf.current);
      const cx = e.clientX;
      const cy = e.clientY;
      moveRaf.current = requestAnimationFrame(() => {
        moveRaf.current = null;
        applyPointer(cx, cy);
      });
    },
    [applyPointer]
  );

  const handleMainLeave = useCallback(() => {
    if (moveRaf.current != null) {
      cancelAnimationFrame(moveRaf.current);
      moveRaf.current = null;
    }
    setPointerInMain(false);
    setLens(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartX.current;
      touchStartX.current = null;
      if (start == null || urls.length <= 1) return;
      const endX = e.changedTouches[0]?.clientX ?? start;
      const d = endX - start;
      if (Math.abs(d) < 48) return;
      if (d < 0) goNext();
      else goPrev();
    },
    [goNext, goPrev, urls.length]
  );

  useEffect(() => {
    if (!lightbox) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLb, goPrev, goNext]);

  const imgCommon = {
    unoptimized: true as const
  };

  const showArrows = urls.length > 1;

  const showLens = isLg && pointerInMain && lens && imgBounds;

  const zoomStyle = useMemo(() => {
    if (!showLens || !lens || !imgBounds) return undefined;
    const zoomPanel = zoomPanelRef.current;
    const panelW = zoomPanel?.clientWidth ?? 0;
    const panelH = zoomPanel?.clientHeight ?? 0;
    if (panelW < 8 || panelH < 8) return undefined;
    const k = panelW / lens.size;
    return {
      position: "absolute" as const,
      left: -(lens.left - imgBounds.ox) * k,
      top: -(lens.top - imgBounds.oy) * k,
      width: imgBounds.w * k,
      height: imgBounds.h * k,
      maxWidth: "none",
      maxHeight: "none"
    };
  }, [showLens, lens, imgBounds, zoomLayoutTick]);

  const showZoomImage = Boolean(zoomStyle);

  const lightboxNode =
    lightbox && mounted ? (
      <div
        className="fixed inset-0 z-[25000] flex flex-col bg-black"
        role="dialog"
        aria-modal="true"
        aria-label="Full screen image"
      >
        <div className="flex shrink-0 items-center justify-end px-3 pt-[max(env(safe-area-inset-top),12px)] pb-2">
          <button
            type="button"
            onClick={closeLb}
            className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
          >
            Close
          </button>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {showArrows && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-1 z-[2] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 sm:left-3"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-7 w-7" strokeWidth={2} />
            </button>
          )}
          <div className="relative h-full w-full max-w-5xl">
            <Image
              src={mainUrl}
              alt={altLabel}
              fill
              className="object-contain"
              style={{ objectPosition: pos }}
              sizes="100vw"
              priority
              onError={() => markUrlFailed(mainUrl)}
              {...imgCommon}
            />
          </div>
          {showArrows && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-1 z-[2] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 sm:right-3"
              aria-label="Next image"
            >
              <ChevronRight className="h-7 w-7" strokeWidth={2} />
            </button>
          )}
        </div>

        {showArrows && (
          <div className="flex shrink-0 justify-center gap-2 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
            {urls.map((url, i) => (
              <button
                key={`lb-dot-${url}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`h-2.5 rounded-full transition ${i === active ? "w-8 bg-white" : "w-2.5 bg-white/40"}`}
                aria-label={`Image ${i + 1}`}
                aria-current={i === active}
              />
            ))}
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      <div>
        <div className="lg:flex lg:items-start lg:gap-5">
          <div className="relative min-w-0 flex-1" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <button
              type="button"
              onClick={openLb}
              onMouseEnter={() => setPointerInMain(true)}
              onMouseLeave={handleMainLeave}
              onMouseMove={handleMainPointerMove}
              className="relative block w-full cursor-zoom-in overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-crown-600"
              aria-label={`View ${altLabel} large. Hover to magnify on desktop.`}
            >
              <div
                ref={stageRef}
                className="relative mx-auto aspect-[3/4] w-full max-h-[min(48dvh,420px)] sm:max-h-[min(58dvh,520px)] lg:max-h-none"
              >
                <Image
                  ref={imgRef}
                  src={mainUrl}
                  alt={altLabel}
                  fill
                  className="object-contain"
                  style={{ objectPosition: pos }}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  onLoad={(e) => {
                    imgRef.current = e.currentTarget;
                    updateBounds();
                  }}
                  onError={() => markUrlFailed(mainUrl)}
                  {...imgCommon}
                />
                {showLens && lens ? (
                  <div
                    className="pointer-events-none absolute z-10 border-2 border-white/95 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] ring-1 ring-black/10"
                    style={{
                      width: lens.size,
                      height: lens.size,
                      left: lens.left,
                      top: lens.top,
                      backgroundColor: "rgba(255,255,255,0.18)"
                    }}
                    aria-hidden
                  />
                ) : null}
              </div>
            </button>

            {showArrows && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute left-2 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/90 text-zinc-800 shadow-md backdrop-blur-sm transition hover:bg-white sm:left-3"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute right-2 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/90 text-zinc-800 shadow-md backdrop-blur-sm transition hover:bg-white sm:right-3"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" strokeWidth={2} />
                </button>
              </>
            )}
          </div>

          <div
            ref={zoomPanelRef}
            className="mt-5 hidden w-full shrink-0 lg:mt-0 lg:block lg:w-[min(380px,42%)] lg:max-w-[420px]"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-inner">
              {showZoomImage ? (
                <Image
                  src={mainUrl}
                  alt=""
                  width={2200}
                  height={2200}
                  draggable={false}
                  className="select-none"
                  style={zoomStyle}
                  onError={() => markUrlFailed(mainUrl)}
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 hidden items-center justify-center px-4 text-center text-xs leading-relaxed text-zinc-400 xl:flex">
                  Hover the image to preview a magnified area.
                </div>
              )}
            </div>
          </div>
        </div>

        {showArrows && (
          <div className="mt-3 flex justify-center gap-px sm:mt-4">
            <div className="flex w-full max-w-md justify-center gap-1.5">
              {urls.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition ${i === active ? "w-6 bg-crown-700" : "w-1.5 bg-zinc-300"}`}
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === active}
                />
              ))}
            </div>
          </div>
        )}

        {urls.length > 1 && (
          <div className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:thin] sm:grid sm:grid-cols-5 sm:overflow-visible">
            {urls.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`relative aspect-square w-[22%] shrink-0 snap-center overflow-hidden rounded-lg border-2 bg-zinc-100 transition sm:w-auto ${
                  i === active ? "border-crown-700 ring-2 ring-crown-500/30" : "border-zinc-200 hover:border-zinc-400"
                }`}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === active}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  style={{ objectPosition: pos }}
                  sizes="120px"
                  loading="lazy"
                  onError={() => markUrlFailed(url)}
                  {...imgCommon}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {mounted && lightboxNode ? createPortal(lightboxNode, document.body) : null}
    </>
  );
}
