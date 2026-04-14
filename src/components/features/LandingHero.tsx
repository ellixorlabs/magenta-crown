"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { HeroSlideVM } from "@/lib/hero-data";
import { DEFAULT_HERO_SLIDES } from "@/lib/hero-data";
import { TRANS_EASE, TRANS_FADE_IN_MS, TRANS_MS, type HeroTransitionId } from "@/lib/hero-transition";

const gold = "#C5A059";

const AUTO_ADVANCE_MS = 4000;

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
  const labelId = useId();
  const [tilt, setTilt] = useState({ x: 0.5, y: 0.5 });
  const [reduceMotion, setReduceMotion] = useState(false);

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
      className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <h2 id={labelId} className="sr-only">
        Featured hero — use left and right arrow keys to change slides
      </h2>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {fadeOutActive ? (
          <>
            <div className="absolute inset-0 z-0">
              <Image
                src={list[incomingIndex! % len].bg}
                alt=""
                fill
                className="object-cover"
                style={{ objectPosition: list[incomingIndex! % len].imagePosition }}
                sizes="100vw"
                unoptimized
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
              <Image
                src={list[displayIndex % len].bg}
                alt=""
                fill
                className="object-cover"
                style={{ objectPosition: list[displayIndex % len].imagePosition }}
                sizes="100vw"
                unoptimized
              />
            </div>
          </>
        ) : (
          <>
            <Image
              src={list[displayIndex % len].bg}
              alt=""
              fill
              className="object-cover"
              style={{ objectPosition: list[displayIndex % len].imagePosition }}
              priority={displayIndex === 0 && incomingIndex === null}
              sizes="100vw"
              unoptimized
            />

            {incomingIndex !== null && !reduceMotion && t !== "none" && (
              <div className="absolute inset-0 z-[1]" style={incomingOverlayStyle()} onTransitionEnd={onLayerTransitionEnd}>
                <Image
                  src={list[incomingIndex % len].bg}
                  alt=""
                  fill
                  className="object-cover"
                  style={{ objectPosition: list[incomingIndex % len].imagePosition }}
                  sizes="100vw"
                  unoptimized
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

      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-28 pt-32 text-center sm:px-6 lg:px-12">
        <p
          className="font-[family-name:var(--font-body)] text-xs font-medium uppercase tracking-[0.35em]"
          style={{ color: gold }}
        >
          {slide.label}
        </p>

        <h1 className="mt-6 font-[family-name:var(--font-heading)] text-4xl font-semibold leading-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl">
          {slide.line1}
          <br />
          <span className="italic" style={{ color: gold }}>
            {slide.accent}
          </span>
        </h1>

        <div className="mx-auto mt-8 max-w-xl space-y-2 font-[family-name:var(--font-heading)] text-base text-white/95 sm:text-lg">
          {subLines.filter(Boolean).map((line, i) => (
            <p key={`${line}-${i}`}>{line}</p>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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

        <div className="mt-14 flex justify-center gap-2" role="tablist" aria-label="Hero slides">
          {list.map((s, i) => (
            <button
              key={s.label + s.bg}
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
