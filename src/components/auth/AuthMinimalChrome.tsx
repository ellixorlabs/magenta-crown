"use client";

import Link from "next/link";

const LEGAL_LINK_CLASS =
  "min-h-11 inline-flex items-center justify-center px-2 text-xs font-medium tracking-wide text-white/75 underline-offset-4 transition hover:text-white md:min-h-0 md:text-[11px] md:text-zinc-500 md:hover:text-zinc-800";

/** Legal strip for auth flows where `ConditionalFooter` is hidden (e.g. sign-in / sign-up). */
export function AuthMinimalChromeFooter() {
  return (
    <footer
      className="mt-auto flex w-full shrink-0 flex-wrap items-center justify-center gap-x-1 gap-y-1 border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-center md:gap-x-3 md:border-zinc-200/90 md:pb-[max(1rem,env(safe-area-inset-bottom))] md:pt-4"
      role="contentinfo"
    >
      <Link href="/legal/privacy" className={LEGAL_LINK_CLASS}>
        Privacy policy
      </Link>
      <span className="hidden text-zinc-300 md:inline" aria-hidden>
        ·
      </span>
      <Link href="/legal/terms" className={LEGAL_LINK_CLASS}>
        Terms
      </Link>
      <span className="hidden text-zinc-300 md:inline" aria-hidden>
        ·
      </span>
      <Link href="/support/contact" className={LEGAL_LINK_CLASS}>
        Contact us
      </Link>
    </footer>
  );
}
