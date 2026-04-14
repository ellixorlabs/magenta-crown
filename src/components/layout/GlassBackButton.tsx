"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function GlassBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/") return null;
  if (pathname?.startsWith("/auth")) return null;
  if (pathname?.startsWith("/admin")) return null;

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="fixed left-[max(0.75rem,env(safe-area-inset-left))] top-[6.25rem] z-[55] flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/30 bg-white/25 text-zinc-800 shadow-lg backdrop-blur-md transition hover:bg-white/40 sm:left-[max(1.25rem,env(safe-area-inset-left))] sm:top-[7rem] dark:border-white/10 dark:bg-black/20 dark:text-white dark:hover:bg-black/35"
    >
      <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
    </button>
  );
}
