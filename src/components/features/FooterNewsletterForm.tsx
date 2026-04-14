"use client";

import { useEffect, useState } from "react";

/**
 * Renders after mount so password-manager extensions (e.g. Dashlane) cannot
 * mutate the DOM before React hydrates, which would cause attribute mismatches.
 */
export function FooterNewsletterForm() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
        aria-hidden
      >
        <div className="h-[42px] flex-1 rounded-full border border-zinc-700 bg-zinc-900" />
        <div className="h-[42px] w-full rounded-full bg-[#C5A059] sm:w-[120px]" />
      </div>
    );
  }

  return (
    <form className="flex w-full max-w-md flex-col gap-2 sm:flex-row" action="#" method="post">
      <input
        type="email"
        name="email"
        placeholder="Newsletter email"
        autoComplete="email"
        className="flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm outline-none placeholder:text-zinc-500"
      />
      <button
        type="submit"
        className="rounded-full bg-[#C5A059] px-5 py-2 text-sm font-semibold text-black hover:opacity-90"
      >
        Subscribe
      </button>
    </form>
  );
}
