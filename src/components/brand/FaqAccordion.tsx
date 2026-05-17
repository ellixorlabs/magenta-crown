"use client";

import { useState } from "react";
import type { FaqEntry } from "@/lib/brand-content";

export function FaqAccordion({ entries }: { entries: FaqEntry[] }) {
  const [openId, setOpenId] = useState<string | null>(entries[0]?.id ?? null);

  if (!entries.length) {
    return <p className="text-sm text-zinc-500">No questions published yet.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/90 bg-white">
      {entries.map((e) => {
        const open = openId === e.id;
        return (
          <li key={e.id}>
            <button
              type="button"
              className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#faf8f6]"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : e.id)}
            >
              <span className="font-[family-name:var(--font-heading)] text-base font-semibold text-zinc-900">
                {e.question}
              </span>
              <span className="mt-0.5 shrink-0 text-lg leading-none text-crown-800" aria-hidden>
                {open ? "−" : "+"}
              </span>
            </button>
            {open ? (
              <div className="border-t border-zinc-100 px-5 pb-5 pt-2 text-sm leading-relaxed text-zinc-700">{e.answer}</div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
