"use client";

import { useEffect } from "react";

export default function SiteSegmentError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-[50vh] bg-[#f8f5f6] py-16">
      <div className="section-shell flex flex-col items-center text-center">
        <p className="font-[family-name:var(--font-heading)] text-xl font-semibold text-zinc-900 sm:text-2xl">
          Something went wrong
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
          We couldn&apos;t load this page. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 min-h-[44px] min-w-[10rem] rounded-full bg-crown-800 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-crown-900 active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
