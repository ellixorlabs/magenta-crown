"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthVisualUrlFromServer } from "@/components/auth/AuthVisualUrlContext";
import { AuthMinimalChromeFooter } from "@/components/auth/AuthMinimalChrome";
import { MC_LOADER_MAROON } from "@/lib/loader-theme";

const AUTH_VISUAL_CACHE_KEY = "mc_auth_visual_url";

let authVisualInFlight: Promise<{ imageUrl?: string }> | null = null;

function fetchAuthVisualDeduped(): Promise<{ imageUrl?: string }> {
  if (authVisualInFlight) return authVisualInFlight;
  console.log("AUTH VISUAL FETCH", Date.now());
  authVisualInFlight = fetch("/api/public/auth-visual")
    .then(async (r) => (await r.json()) as { imageUrl?: string })
    .finally(() => {
      authVisualInFlight = null;
    });
  return authVisualInFlight;
}

/** Desktop portrait + mobile banner: native `<img>` only (no `next/image` here). */
function AuthPromoImage({
  imageUrl,
  onImageError,
  variant
}: Readonly<{
  imageUrl: string;
  onImageError: () => void;
  variant: "banner" | "portrait";
}>) {
  const isBanner = variant === "banner";
  if (isBanner) {
    return (
      <div className="relative aspect-[16/7] w-full max-h-[220px] min-h-[180px] shrink-0 self-stretch overflow-hidden rounded-t-[32px] bg-neutral-100 lg:hidden">
        <img
          src={imageUrl}
          alt="Magenta Crown"
          className="absolute inset-0 h-full w-full object-cover object-center rounded-t-[32px]"
          loading="eager"
          decoding="async"
          width={1200}
          height={630}
          onError={onImageError}
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto hidden aspect-[3/4] w-full min-w-0 max-w-[480px] shrink-0 self-stretch overflow-hidden rounded-3xl bg-neutral-100 lg:block">
      {(
        console.log("RENDER CHECK", {
          imageUrl,
          hasImage: !!imageUrl
        }),
        null
      )}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Magenta Crown"
          className="absolute inset-0 h-full w-full object-cover"
          width={1200}
          height={1600}
          onLoad={() => console.log("IMAGE LOADED")}
          onError={(e) => console.log("IMAGE FAILED", e)}
        />
      ) : (
        <div className="absolute inset-0 bg-red-500 text-white">IMAGE URL EMPTY</div>
      )}
    </div>
  );
}

/**
 * Auth pages: light shell with a soft brand-tinted gradient (no full-bleed photography).
 * Requires `AuthVisualUrlProvider` from `src/app/(site)/auth/layout.tsx`.
 */
export function AuthImmersiveShell({
  children,
  mobileAlign = "top",
  minimalChrome = false
}: Readonly<{
  children: React.ReactNode;
  mobileAlign?: "top" | "center";
  minimalChrome?: boolean;
}>) {
  const fromServer = useAuthVisualUrlFromServer();
  const [imageUrl, setImageUrl] = useState(fromServer);

  useEffect(() => {
    if (fromServer) {
      setImageUrl(fromServer);
    }
  }, [fromServer]);

  useEffect(() => {
    try {
      const ls = window.localStorage.getItem(AUTH_VISUAL_CACHE_KEY) ?? "";
      if (ls && !fromServer) {
        setImageUrl(ls);
      }
    } catch {
      // ignore
    }
  }, [fromServer]);

  useEffect(() => {
    let cancelled = false;
    void fetchAuthVisualDeduped()
      .then((json) => {
        if (cancelled || typeof json?.imageUrl !== "string") return;
        const nextUrl = json.imageUrl.trim();
        if (!nextUrl) return;
        setImageUrl((prev) => {
          if (prev === nextUrl) return prev;
          try {
            window.localStorage.setItem(AUTH_VISUAL_CACHE_KEY, nextUrl);
          } catch {
            // ignore
          }
          return nextUrl;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const onImageError = useCallback(() => {
    setImageUrl("");
    try {
      window.localStorage.removeItem(AUTH_VISUAL_CACHE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const authVisual = { fromServer, imageUrl };
  console.log("AUTH IMAGE URL:", imageUrl);
  console.log("AUTH VISUAL DATA:", authVisual);

  const shellGrid = (
    <div className="grid h-auto w-full min-w-0 auto-rows-auto grid-cols-1 overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-sm lg:min-h-[640px] lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex min-w-0 flex-col items-stretch justify-center lg:p-8">
        {imageUrl ? <AuthPromoImage imageUrl={imageUrl} onImageError={onImageError} variant="banner" /> : null}
        <AuthPromoImage imageUrl={imageUrl} onImageError={onImageError} variant="portrait" />
      </div>
      <div className="flex min-w-0 w-full flex-1 flex-col justify-start lg:min-h-0">{children}</div>
    </div>
  );

  return (
    <div
      className="relative h-auto min-h-screen w-full overflow-x-hidden overflow-y-auto md:bg-[#faf7f8]"
      style={{ backgroundColor: MC_LOADER_MAROON }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 md:block" aria-hidden>
        <div
          className="absolute inset-0 md:bg-gradient-to-b md:from-white md:via-[#faf7f8] md:to-[#f0e8ec]"
          style={{ backgroundColor: MC_LOADER_MAROON }}
        />
      </div>

      <div
        className={
          minimalChrome
            ? "relative z-10 mx-auto flex min-h-screen w-full min-w-0 max-w-[1500px] flex-col justify-between px-6 py-10 lg:px-8"
            : `relative z-10 mx-auto flex w-full min-w-0 max-w-[1500px] px-6 py-10 lg:px-8 md:items-center ${
                mobileAlign === "center" ? "items-center" : "items-start"
              }`
        }
      >
        {minimalChrome ? (
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-start">{shellGrid}</div>
        ) : (
          shellGrid
        )}
        {minimalChrome ? <AuthMinimalChromeFooter /> : null}
      </div>
    </div>
  );
}
