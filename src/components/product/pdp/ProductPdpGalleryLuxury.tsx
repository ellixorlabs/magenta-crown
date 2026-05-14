"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

const FALLBACK = "/branding/mc-loader-logo.png";

export type ImgBounds = { ox: number; oy: number; w: number; h: number };
export type LensRect = { left: number; top: number; size: number };

export type MagnifyFrame = {
  url: string;
  lens: LensRect;
  imgBounds: ImgBounds;
  /** Viewport coordinates — used to dock the floating loupe beside the cursor. */
  pointer: { clientX: number; clientY: number };
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function computeLens(clientX: number, clientY: number, stage: HTMLDivElement, imgBounds: ImgBounds): LensRect | null {
  const rect = stage.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const { ox, oy, w, h } = imgBounds;
  if (x < ox || x > ox + w || y < oy || y > oy + h) return null;
  const size = clamp(Math.round(Math.min(w, h) * 0.22), 72, 160);
  const cx = clamp(x, ox + size / 2, ox + w - size / 2);
  const cy = clamp(y, oy + size / 2, oy + h - size / 2);
  return { left: cx - size / 2, top: cy - size / 2, size };
}

export function computeZoomStyle(
  lens: LensRect,
  imgBounds: ImgBounds,
  panelW: number,
  panelH: number
): CSSProperties | undefined {
  if (panelW < 8 || panelH < 8) return undefined;
  const k = panelW / lens.size;
  return {
    position: "absolute",
    left: -(lens.left - imgBounds.ox) * k,
    top: -(lens.top - imgBounds.oy) * k,
    width: imgBounds.w * k,
    height: imgBounds.h * k,
    maxWidth: "none",
    maxHeight: "none"
  };
}

type Props = {
  name: string;
  imageAlt?: string;
  imageUrls: string[];
  listImageIndex: number;
  listImagePosition: string;
  /** Desktop hover magnifier: report frame for parent overlay (details column). */
  onMagnifyFrame: (frame: MagnifyFrame | null) => void;
};

function ProductPdpGalleryLuxuryInner({
  name,
  imageAlt,
  imageUrls,
  listImageIndex,
  listImagePosition,
  onMagnifyFrame
}: Props) {
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

  const pos = listImagePosition?.trim() || "center";
  const mainUrl = urls[active] ?? FALLBACK;

  const [isFinePointerDesktop, setIsFinePointerDesktop] = useState(false);
  const moveRaf = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const [pinchScale, setPinchScale] = useState(1);

  const cellStageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgElsRef = useRef<(HTMLImageElement | null)[]>([]);
  const [imgBoundsByIdx, setImgBoundsByIdx] = useState<Record<number, ImgBounds | null>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const sync = () => setIsFinePointerDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const markUrlFailed = useCallback((url: string) => {
    if (!url || url === FALLBACK) return;
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const updateBoundsForIndex = useCallback((i: number) => {
    const stage = cellStageRefs.current[i];
    const img = imgElsRef.current[i] ?? stage?.querySelector("img") ?? null;
    if (!stage || !img || !img.complete || img.naturalWidth === 0) return;
    const sr = stage.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    if (ir.width < 2 || ir.height < 2) return;
    setImgBoundsByIdx((prev) => ({
      ...prev,
      [i]: { ox: ir.left - sr.left, oy: ir.top - sr.top, w: ir.width, h: ir.height }
    }));
  }, []);

  useLayoutEffect(() => {
    urls.forEach((_, i) => updateBoundsForIndex(i));
  }, [active, urls, pos, updateBoundsForIndex, mainUrl]);

  useEffect(() => {
    const onResize = () => urls.forEach((_, i) => updateBoundsForIndex(i));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [urls, updateBoundsForIndex]);

  const goPrev = useCallback(() => {
    setActive((i) => (i - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goNext = useCallback(() => {
    setActive((i) => (i + 1) % urls.length);
  }, [urls.length]);

  const applyMagnify = useCallback(
    (clientX: number, clientY: number, cellIndex: number) => {
      if (!isFinePointerDesktop) {
        onMagnifyFrame(null);
        return;
      }
      const stage = cellStageRefs.current[cellIndex];
      const bounds = imgBoundsByIdx[cellIndex];
      if (!stage || !bounds) {
        onMagnifyFrame(null);
        return;
      }
      const lens = computeLens(clientX, clientY, stage, bounds);
      if (!lens) {
        onMagnifyFrame(null);
        return;
      }
      onMagnifyFrame({
        url: urls[cellIndex] ?? mainUrl,
        lens,
        imgBounds: bounds,
        pointer: { clientX, clientY }
      });
    },
    [isFinePointerDesktop, imgBoundsByIdx, mainUrl, onMagnifyFrame, urls]
  );

  const clearMagnify = useCallback(() => {
    if (moveRaf.current != null) {
      cancelAnimationFrame(moveRaf.current);
      moveRaf.current = null;
    }
    onMagnifyFrame(null);
  }, [onMagnifyFrame]);

  const handleCellMove = useCallback(
    (e: React.MouseEvent, cellIndex: number) => {
      if (!isFinePointerDesktop) return;
      if (moveRaf.current != null) cancelAnimationFrame(moveRaf.current);
      const cx = e.clientX;
      const cy = e.clientY;
      moveRaf.current = requestAnimationFrame(() => {
        moveRaf.current = null;
        applyMagnify(cx, cy, cellIndex);
      });
    },
    [applyMagnify, isFinePointerDesktop]
  );

  const openLb = useCallback(() => setLightbox(true), []);
  const closeLb = useCallback(() => setLightbox(false), []);

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

  const showArrows = urls.length > 1;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStart.current = { dist, scale: pinchScale };
      touchStartX.current = null;
      return;
    }
    pinchStart.current = null;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, [pinchScale]);

  const mobileStageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = mobileStageRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2) e.preventDefault();
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinchStart.current.dist;
      const next = clamp(pinchStart.current.scale * ratio, 1, 2.4);
      setPinchScale(next);
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const wasPinching = pinchStart.current != null;
      if (e.touches.length < 2) {
        pinchStart.current = null;
      }
      if (e.touches.length === 0) {
        setPinchScale(1);
      }
      if (wasPinching) {
        touchStartX.current = null;
        return;
      }
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
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4">
          {showArrows && (
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
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
              quality={75}
              loading="lazy"
              onError={() => markUrlFailed(mainUrl)}
            />
          </div>
          {showArrows && (
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
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
      {/* Mobile: swipe + pinch on active slide */}
      <div className="lg:hidden">
        <div
          ref={mobileStageRef}
          className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50 shadow-sm"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            onClick={openLb}
            className="relative block w-full cursor-zoom-in outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-crown-600"
            aria-label={`View ${altLabel} large.`}
          >
            <div
              className="relative mx-auto aspect-[3/4] w-full max-h-[min(70dvh,560px)]"
              style={{
                transform: `scale(${pinchScale})`,
                transformOrigin: "center center",
                transition: pinchScale === 1 ? "transform 0.25s ease-out" : "none"
              }}
            >
              <Image
                src={mainUrl}
                alt={altLabel}
                fill
                className="object-contain"
                style={{ objectPosition: pos }}
                sizes="100vw"
                priority
                quality={80}
                onError={() => markUrlFailed(mainUrl)}
              />
            </div>
          </button>
          {showArrows && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-800 shadow-md backdrop-blur-sm"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  goNext();
                }}
                className="absolute right-2 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-800 shadow-md backdrop-blur-sm"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
        {showArrows && (
          <div className="mt-3 flex justify-center gap-1.5">
            {urls.map((_, i) => (
              <button
                key={`m-dot-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition ${i === active ? "w-6 bg-crown-800" : "w-1.5 bg-zinc-300"}`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
        {urls.length > 1 && (
          <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {urls.map((url, i) => (
              <button
                key={`thumb-m-${url}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`relative aspect-[3/4] w-[4.5rem] shrink-0 snap-center overflow-hidden rounded-lg border bg-zinc-100 transition ${
                  i === active ? "border-crown-800 ring-2 ring-crown-500/25" : "border-zinc-200"
                }`}
                aria-label={`Show image ${i + 1}`}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  style={{ objectPosition: pos }}
                  sizes="72px"
                  loading="lazy"
                  onError={() => markUrlFailed(url)}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: 2-column grid */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-3" onPointerLeave={clearMagnify}>
        {urls.map((url, i) => (
          <div key={`${url}-d-${i}`} className="min-w-0">
            <button
              type="button"
              onClick={() => setActive(i)}
              onMouseEnter={() => {
                updateBoundsForIndex(i);
              }}
              onMouseMove={(e) => handleCellMove(e, i)}
              className={`relative block w-full overflow-hidden rounded-xl border bg-zinc-50 text-left shadow-sm outline-none ring-offset-2 transition hover:border-zinc-300 focus-visible:ring-2 focus-visible:ring-crown-600 ${
                i === active ? "border-crown-800/40 ring-1 ring-crown-500/20" : "border-zinc-200/90"
              }`}
              aria-label={`Image ${i + 1}. Hover to magnify.`}
              aria-current={i === active}
            >
              <div
                ref={(el) => {
                  cellStageRefs.current[i] = el;
                }}
                className="relative aspect-[3/4] w-full"
              >
                <Image
                  ref={(el) => {
                    imgElsRef.current[i] = el;
                  }}
                  src={url}
                  alt={i === 0 ? altLabel : `${altLabel} — view ${i + 1}`}
                  fill
                  className="object-contain"
                  style={{ objectPosition: pos }}
                  sizes="(max-width: 1280px) 40vw, 520px"
                  priority={i === 0}
                  loading={i > 0 ? "lazy" : undefined}
                  quality={80}
                  onLoad={() => updateBoundsForIndex(i)}
                  onError={() => markUrlFailed(url)}
                />
              </div>
            </button>
          </div>
        ))}
      </div>

      {mounted && lightboxNode ? createPortal(lightboxNode, document.body) : null}
    </>
  );
}

export const ProductPdpGalleryLuxury = memo(ProductPdpGalleryLuxuryInner);
