"use client";

import { useEffect, useState } from "react";

/**
 * Auth pages: light shell with a soft brand-tinted gradient (no full-bleed photography).
 */
export function AuthImmersiveShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/auth-visual", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { imageUrl?: string }) => {
        if (!cancelled && typeof json?.imageUrl === "string") {
          setImageUrl(json.imageUrl);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-[#faf7f8]">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#faf7f8] to-[#f0e8ec]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center px-4 pb-8 pt-24 md:pb-10 md:pt-28">
        <div className="grid max-h-[calc(100dvh-8.5rem)] w-full grid-cols-1 gap-4 rounded-[28px] border border-zinc-200/90 bg-white p-3 shadow-[0_24px_64px_-18px_rgba(0,0,0,0.18)] md:grid-cols-[0.75fr_1.25fr] md:gap-5 md:p-5">
          <div className="hidden items-center justify-center md:flex">
            <div
              className="h-[450px] w-[350px] min-h-[380px] rounded-3xl bg-[#9a8b87] bg-cover bg-center"
              style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
            />
          </div>
          <div className="flex min-h-0 items-center justify-center">{children}</div>
        </div>
      </div>
    </div>
  );
}
