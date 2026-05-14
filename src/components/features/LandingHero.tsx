"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HeroSlideVM } from "@/lib/hero-public";
import { DEFAULT_HERO_SLIDES, heroSlideStableKey } from "@/lib/hero-public";
import { useHeroReady } from "@/context/HeroReadyContext";
import { TRANS_EASE, TRANS_FADE_IN_MS, TRANS_MS, type HeroTransitionId } from "@/lib/hero-transition";

const gold = "#C5A059";

const AUTO_ADVANCE_MS = 4000;

/** Storefront hero / cards: single quality avoids Next `images.qualities` churn and console warnings. */
const STORE_IMAGE_QUALITY = 75;

/** Hero URLs come from CMS (Supabase, etc.); bypass optimizer so bad `remotePatterns` / optimizer errors never yield a blank layer. */
const HERO_BG_UNOPTIMIZED = true;

function heroOptimizerImgUrl(src: string): string {
  const { props } = getImageProps({
    alt: "",
    src,
    width: 1920,
    height: 1080,
    sizes: "100vw",
    quality: STORE_IMAGE_QUALITY
  });
  return props.src;
}

type HeroBgImageProps = {
  slide: HeroSlideVM;
  imageSrc: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  onLoad?: () => void;
  onError?: () => void;
};

const HeroBgImage = memo(function HeroBgImage({
  slide,
  imageSrc,
  priority,
  loading,
  fetchPriority,
  onLoad,
  onError
}: HeroBgImageProps) {
  return (
    <Image
      src={imageSrc}
      alt=""
      fill
      unoptimized={HERO_BG_UNOPTIMIZED}
      className="object-cover"
      style={{ objectPosition: slide.imagePosition }}
      sizes="100vw"
      quality={STORE_IMAGE_QUALITY}
      priority={priority}
      loading={loading}
      fetchPriority={fetchPriority}
      onLoad={onLoad}
      onError={onError}
    />
  );
});

type Props = {
  slides: HeroSlideVM[];
  transition: HeroTransitionId;
};

function shortestWipeDirection(from: number, to: number, len: number): 1 | -1 {
  if (len <= 1) return 1;
  const forward = (to - from + len) % len;
  const backward = (from - to + len) % len;
  return forward <= backward ? 1 : -1;
}

export function LandingHero({ slides, transition }: Props) {
  const list = slides.length ? slides : DEFAULT_HERO_SLIDES;
  const len = list.length;

  const [displayIndex, setDisplayIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeDir, setWipeDir] = useState<1 | -1>(1);

  const heroRef = useRef<HTMLElement>(null);
  const heroReadyNotified = useRef(false);
  const { markHeroReady } = useHeroReady();
  const labelId = useId();
  const [tilt, setTilt] = useState({ x: 0.5, y: 0.5 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const displayIndexRef = useRef(0);
  const incomingIndexRef = useRef<number | null>(null);
  const transitionRef = useRef(transition);
  const endHandledRef = useRef(false);

  useEffect(() => {
    transitionRef.current = transition;
  }, [transition]);

  useEffect(() => {
    displayIndexRef.current = displayIndex;
  }, [displayIndex]);
  useEffect(() => {
    incomingIndexRef.current = incomingIndex;
  }, [incomingIndex]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const on = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const slideBg = useCallback(
    (s: HeroSlideVM) => {
      if (isMobile) return s.bgMobile || s.bg || s.bgDesktop || "";
      return s.bgDesktop || s.bg || s.bgMobile || "";
    },
    [isMobile]
  );

  const nextSlideBg = useMemo(() => {
    if (len <= 1) return null;
    return slideBg(list[(displayIndex + 1) % len]);
  }, [len, displayIndex, list, slideBg]);

  /** Warm only the upcoming hero frame (match `Image` `src`: optimizer URL vs raw when `unoptimized`). */
  useEffect(() => {
    if (!nextSlideBg || reduceMotion) return;
    let href: string;
    try {
      href = HERO_BG_UNOPTIMIZED ? nextSlideBg : heroOptimizerImgUrl(nextSlideBg);
    } catch {
      if (!HERO_BG_UNOPTIMIZED) return;
      href = nextSlideBg;
    }
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    link.setAttribute("fetchpriority", "low");
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [nextSlideBg, reduceMotion]);

  const commit = useCallback(() => {
    const inc = incomingIndexRef.current;
    if (inc === null) return;
    setDisplayIndex(inc);
    setIncomingIndex(null);
    setWipeOpen(false);
  }, []);

  const startTransition = useCallback(
    (to: number, dir: 1 | -1) => {
      if (len <= 1) return;
      if (incomingIndexRef.current !== null) return;
      if (to === displayIndexRef.current) return;

      const t = transitionRef.current;
      if (t === "none" || reduceMotion) {
        setDisplayIndex(to);
        return;
      }

      endHandledRef.current = false;
      setWipeDir(dir);
      setIncomingIndex(to);
      setWipeOpen(false);
    },
    [len, reduceMotion]
  );

  useLayoutEffect(() => {
    if (incomingIndex === null) return;
    const t = transitionRef.current;
    if (t === "none" || reduceMotion) return;
    setWipeOpen(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setWipeOpen(true));
    });
    return () => cancelAnimationFrame(id);
  }, [incomingIndex, reduceMotion]);

  const onLayerTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (incomingIndexRef.current === null) return;
      if (endHandledRef.current) return;

      const t = transitionRef.current;
      const { propertyName } = e;

      const ok = (() => {
        if (t === "wipe") return propertyName === "transform";
        if (t === "fade" || t === "fadeIn") return propertyName === "opacity";
        if (t === "fadeOut") return propertyName === "opacity";
        if (t === "slideFade" || t === "zoomFade") return propertyName === "transform";
        return false;
      })();
      if (!ok) return;

      endHandledRef.current = true;
      commit();
    },
    [commit]
  );

  useEffect(() => {
    if (len <= 1) return;
    const id = setInterval(() => {
      if (incomingIndexRef.current !== null) return;
      const next = (displayIndexRef.current + 1) % len;
      startTransition(next, 1);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [len, startTransition]);

  const nextSlide = useCallback(() => {
    if (len <= 1) return;
    const next = (displayIndexRef.current + 1) % len;
    startTransition(next, 1);
  }, [len, startTransition]);

  const prevSlide = useCallback(() => {
    if (len <= 1) return;
    const prev = (displayIndexRef.current - 1 + len) % len;
    startTransition(prev, -1);
  }, [len, startTransition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextSlide, prevSlide]);

  const visualIndex = incomingIndex ?? displayIndex;
  const slide = list[visualIndex % len];
  const subLines = slide.sub.length ? slide.sub : ["", ""];

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduceMotion) return;
      const el = heroRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setTilt({
        x: (e.clientX - r.left) / Math.max(r.width, 1),
        y: (e.clientY - r.top) / Math.max(r.height, 1)
      });
    },
    [reduceMotion]
  );

  const onMouseLeave = useCallback(() => setTilt({ x: 0.5, y: 0.5 }), []);

  const offX = wipeDir === 1 ? "100%" : "-100%";
  const t = transition;
  const fadeMs = t === "fadeIn" ? TRANS_FADE_IN_MS : TRANS_MS;

  const fadeOutActive = t === "fadeOut" && incomingIndex !== null && !reduceMotion;

  const notifyHeroReadyOnce = useCallback(() => {
    if (heroReadyNotified.current) return;
    heroReadyNotified.current = true;
    markHeroReady();
  }, [markHeroReady]);

  /** Do not block the shell when the user prefers reduced motion. */
  useEffect(() => {
    if (reduceMotion) notifyHeroReadyOnce();
  }, [reduceMotion, notifyHeroReadyOnce]);

  const incomingOverlayStyle = (): React.CSSProperties => {
    if (!wipeOpen) {
      if (t === "wipe") {
        return {
          transform: `translate3d(${offX},0,0)`,
          transition: "none",
          willChange: "transform"
        };
      }
      if (t === "fade" || t === "fadeIn") {
        return { opacity: 0, transition: "none", willChange: "opacity" };
      }
      if (t === "slideFade") {
        const x = wipeDir === 1 ? "9%" : "-9%";
        return {
          transform: `translate3d(${x},0,0)`,
          opacity: 0.15,
          transition: "none",
          willChange: "transform, opacity"
        };
      }
      if (t === "zoomFade") {
        return {
          transform: "translate3d(0,0,0) scale(1.09)",
          opacity: 0,
          transition: "none",
          willChange: "transform, opacity"
        };
      }
    }
    if (t === "wipe") {
      return {
        transform: "translate3d(0,0,0)",
        transition: `transform ${TRANS_MS}ms ${TRANS_EASE}`,
        willChange: "transform"
      };
    }
    if (t === "fade" || t === "fadeIn") {
      return {
        opacity: 1,
        transition: `opacity ${fadeMs}ms ${TRANS_EASE}`,
        willChange: "opacity"
      };
    }
    if (t === "slideFade") {
      return {
        transform: "translate3d(0,0,0)",
        opacity: 1,
        transition: `opacity ${TRANS_MS}ms ${TRANS_EASE}, transform ${TRANS_MS}ms ${TRANS_EASE}`,
        willChange: "transform, opacity"
      };
    }
    if (t === "zoomFade") {
      return {
        transform: "translate3d(0,0,0) scale(1)",
        opacity: 1,
        transition: `opacity ${TRANS_MS}ms ${TRANS_EASE}, transform ${TRANS_MS}ms ${TRANS_EASE}`,
        willChange: "transform, opacity"
      };
    }
    return {};
  };

  return (
    <section
      ref={heroRef}
      id="landing-hero"
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      tabIndex={0}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      aria-live="polite"
      className="relative flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] shrink-0 touch-pan-y flex-col overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black supports-[min-height:100svh]:h-[100svh] supports-[min-height:100svh]:max-h-[100svh] supports-[min-height:100svh]:min-h-[100svh]"
    >
      <h2 id={labelId} className="sr-only">
        Featured hero — use left and right arrow keys to change slides
      </h2>

      <div className="pointer-events-none absolute inset-0 min-h-0 overflow-hidden">
        {fadeOutActive ? (
          <>
            <div className="absolute inset-0 z-0">
              <HeroBgImage
                slide={list[incomingIndex! % len]}
                imageSrc={slideBg(list[incomingIndex! % len])}
                loading="lazy"
                fetchPriority="low"
                onLoad={notifyHeroReadyOnce}
                onError={notifyHeroReadyOnce}
              />
            </div>
            <div
              className="absolute inset-0 z-[1]"
              style={{
                opacity: wipeOpen ? 0 : 1,
                transition: wipeOpen ? `opacity ${TRANS_MS}ms ${TRANS_EASE}` : "none",
                willChange: "opacity"
              }}
              onTransitionEnd={onLayerTransitionEnd}
            >
              <HeroBgImage
                slide={list[displayIndex % len]}
                imageSrc={slideBg(list[displayIndex % len])}
                loading="lazy"
                fetchPriority="low"
                onLoad={notifyHeroReadyOnce}
                onError={notifyHeroReadyOnce}
              />
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 z-0">
              <HeroBgImage
                slide={list[displayIndex % len]}
                imageSrc={slideBg(list[displayIndex % len])}
                priority={displayIndex === 0 && incomingIndex === null}
                loading={displayIndex === 0 && incomingIndex === null ? "eager" : "lazy"}
                fetchPriority={displayIndex === 0 && incomingIndex === null ? "high" : "low"}
                onLoad={notifyHeroReadyOnce}
                onError={notifyHeroReadyOnce}
              />
            </div>

            {incomingIndex !== null && !reduceMotion && t !== "none" && (
              <div className="absolute inset-0 z-[1] min-h-0" style={incomingOverlayStyle()} onTransitionEnd={onLayerTransitionEnd}>
                <HeroBgImage
                  slide={list[incomingIndex % len]}
                  imageSrc={slideBg(list[incomingIndex % len])}
                  loading="lazy"
                  fetchPriority="low"
                  onLoad={notifyHeroReadyOnce}
                  onError={notifyHeroReadyOnce}
                />
              </div>
            )}
          </>
        )}

        <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/70 via-black/42 to-black/84" />

        {!reduceMotion && (
          <div
            className="absolute inset-0 z-[2] mix-blend-soft-light opacity-[0.65]"
            style={{
              background: `radial-gradient(ellipse 90% 60% at ${tilt.x * 100}% ${tilt.y * 100}%, rgba(255,255,255,0.2) 0%, transparent 52%)`
            }}
          />
        )}

        <div
          className="absolute inset-0 z-[2] opacity-[0.12]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px"
          }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-24 pt-28 text-center sm:px-6 sm:pb-24 sm:pt-28 lg:px-10 lg:pb-20 lg:pt-24 xl:px-12">
        <p
          className="font-[family-name:var(--font-body)] text-xs font-medium uppercase tracking-[0.35em] lg:text-[11px]"
          style={{ color: gold }}
        >
          {slide.label}
        </p>

        <h1 className="mt-5 font-[family-name:var(--font-heading)] text-4xl font-semibold leading-tight text-white drop-shadow-lg sm:mt-6 sm:text-5xl md:text-6xl lg:mt-5 lg:text-6xl xl:text-7xl">
          {slide.line1}
          <br />
          <span className="italic" style={{ color: gold }}>
            {slide.accent}
          </span>
        </h1>

        <div className="mx-auto mt-7 max-w-xl space-y-2 font-[family-name:var(--font-heading)] text-base text-white/95 sm:mt-8 sm:text-lg lg:mt-7">
          {subLines.filter(Boolean).map((line, i) => (
            <p key={`${heroSlideStableKey(slide)}-${i}`}>{line}</p>
          ))}
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:mt-8">
          <Link
            href="/shop"
            className="inline-flex min-w-[200px] items-center justify-center px-8 py-3 text-sm font-semibold text-black transition hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: gold }}
          >
            Explore collection →
          </Link>
          <Link
            href="/shop?sort=new"
            className="inline-flex min-w-[180px] items-center justify-center border px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
            style={{ borderColor: gold }}
          >
            New arrivals
          </Link>
        </div>

        <div className="mt-11 flex justify-center gap-2 lg:mt-10" role="tablist" aria-label="Hero slides">
          {list.map((s, i) => (
            <button
              key={heroSlideStableKey(s)}
              type="button"
              role="tab"
              aria-selected={i === visualIndex}
              aria-label={`Slide ${i + 1} of ${list.length}`}
              className={`h-2 rounded-full transition-all ${i === visualIndex ? "w-8 bg-[#C5A059]" : "w-2 bg-white/35"}`}
              onClick={() => startTransition(i, shortestWipeDirection(displayIndex, i, len))}
            />
          ))}
        </div>
      </div>

      <div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 font-[family-name:var(--font-body)] text-[10px] font-medium uppercase tracking-[0.5em]"
        style={{ color: gold }}
      >
        Scroll
      </div>
    </section>
  );
}
