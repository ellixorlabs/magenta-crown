"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AuthMinimalChromeFooter } from "@/components/auth/AuthMinimalChrome";
import { MC_LOADER_MAROON } from "@/lib/loader-theme";

const AUTH_VISUAL_CACHE_KEY = "mc_auth_visual_url";

/**
 * Auth pages: light shell with a soft brand-tinted gradient (no full-bleed photography).
 */
export function AuthImmersiveShell({
  children,
  mobileAlign = "top",
  minimalChrome = false
}: Readonly<{
  children: React.ReactNode;
  mobileAlign?: "top" | "center";
  /** Legal strip at bottom; site header comes from `SiteNavWithData` in the parent layout. */
  minimalChrome?: boolean;
}>) {
  const [imageUrl, setImageUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(AUTH_VISUAL_CACHE_KEY) ?? "";
  });
  const [imageReady, setImageReady] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem(AUTH_VISUAL_CACHE_KEY));
  });

  useEffect(() => {
    if (!imageUrl) {
      setImageReady(false);
      return;
    }
    const img = new window.Image();
    img.decoding = "async";
    img.fetchPriority = "high";
    img.onload = () => setImageReady(true);
    img.onerror = () => setImageReady(false);
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/auth-visual", { cache: "force-cache" })
      .then((r) => r.json())
      .then((json: { imageUrl?: string }) => {
        if (cancelled || typeof json?.imageUrl !== "string") return;
        const nextUrl = json.imageUrl.trim();
        if (!nextUrl || nextUrl === imageUrl) return;
        const next = new window.Image();
        next.decoding = "async";
        next.fetchPriority = "high";
        next.onload = () => {
          if (cancelled) return;
          setImageReady(true);
          setImageUrl(nextUrl);
          window.localStorage.setItem(AUTH_VISUAL_CACHE_KEY, nextUrl);
        };
        next.onerror = () => {
          /* keep previous image if next fails */
        };
        next.src = nextUrl;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const shellGrid = (
    <div
      className={`grid w-full min-w-0 grid-cols-1 gap-4 md:rounded-[28px] md:border md:border-zinc-200/90 md:bg-white md:p-5 md:shadow-[0_24px_64px_-18px_rgba(0,0,0,0.18)] lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] ${
        minimalChrome
          ? "max-h-[calc(100dvh-10.5rem)] md:max-h-[calc(100dvh-9.5rem)]"
          : "max-h-[calc(100dvh-5rem)] md:max-h-[calc(100dvh-8.5rem)]"
      }`}
    >
      <div className="hidden min-w-0 max-w-full items-center justify-center overflow-hidden md:flex">
        <div className="relative aspect-[7/9] w-full max-w-[min(340px,calc(100%-0.5rem))] overflow-hidden rounded-3xl bg-white">
          {!imageReady ? (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#f7f2f4] via-[#f2e9ed] to-[#f7f2f4]" />
          ) : null}
          {imageUrl ? (
            <Image
              src={imageUrl}
              fill
              sizes="(max-width: 768px) 100vw, 340px"
              alt=""
              aria-hidden
              loading="lazy"
              unoptimized
              onError={() => {
                setImageReady(false);
                setImageUrl("");
                try {
                  window.localStorage.removeItem(AUTH_VISUAL_CACHE_KEY);
                } catch {
                  // ignore
                }
              }}
              className={`object-contain object-center transition-opacity duration-150 ${imageReady ? "opacity-100" : "opacity-0"}`}
            />
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 items-center justify-center md:px-1">{children}</div>
    </div>
  );

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden md:bg-[#faf7f8]" style={{ backgroundColor: MC_LOADER_MAROON }}>
      <div className="pointer-events-none absolute inset-0 z-0 md:block" aria-hidden>
        <div
          className="absolute inset-0 md:bg-gradient-to-b md:from-white md:via-[#faf7f8] md:to-[#f0e8ec]"
          style={{ backgroundColor: MC_LOADER_MAROON }}
        />
      </div>

      <div
        className={
          minimalChrome
            ? "relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-between px-6 pb-8 pt-3 md:px-4 md:pb-10 md:pt-4"
            : `relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl px-6 pb-8 pt-4 md:items-center md:px-4 md:pb-10 md:pt-8 ${
                mobileAlign === "center" ? "items-center" : "items-start"
              }`
        }
      >
        {minimalChrome ? (
          <div className="flex min-h-0 w-full flex-1 flex-col py-3 md:justify-center md:py-4">{shellGrid}</div>
        ) : (
          shellGrid
        )}
        {minimalChrome ? <AuthMinimalChromeFooter /> : null}
      </div>
    </div>
  );
}
