"use client";

import Image from "next/image";

const AUTH_BG =
  "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1920&q=80";

export function AuthImmersiveShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <Image
          src={AUTH_BG}
          alt=""
          fill
          priority
          className="object-cover object-[center_22%]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/75 via-zinc-900/65 to-[#1a0a12]/92"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(196,165,120,0.12),_transparent_55%)]"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-24 sm:pb-20 sm:pt-28">
        {children}
      </div>
    </div>
  );
}
