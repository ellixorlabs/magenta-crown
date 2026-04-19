"use client";

/**
 * Auth pages: light shell with a soft brand-tinted gradient (no full-bleed photography).
 */
export function AuthImmersiveShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-[#faf7f8]">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#faf7f8] to-[#f0e8ec]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-15%,rgba(196,165,120,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-transparent to-[#ebe3e8]/45" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-24 sm:pb-20 sm:pt-28">
        {children}
      </div>
    </div>
  );
}
