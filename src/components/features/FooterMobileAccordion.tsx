"use client";

import Link from "next/link";
import { useState } from "react";

type Col = { title: string; links: Array<{ label: string; href: string }> };

export function FooterMobileAccordion({
  columns,
  shopLinks
}: {
  columns: Col[];
  shopLinks: Array<{ label: string; href: string }>;
}) {
  const all: Col[] = [{ title: "Shop", links: shopLinks }, ...columns];
  const [open, setOpen] = useState<string | null>(all[0]?.title ?? null);

  return (
    <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800/60">
      {all.map((col) => {
        const isOpen = open === col.title;
        return (
          <li key={col.title}>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-zinc-200"
              onClick={() => setOpen(isOpen ? null : col.title)}
              aria-expanded={isOpen}
            >
              {col.title}
              <span className="text-crown-300" aria-hidden>
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen ? (
              <ul className="space-y-2 border-t border-zinc-800/60 px-4 pb-4 pt-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    {l.href.startsWith("http") ? (
                      <a
                        href={l.href}
                        className="text-zinc-400 hover:text-white"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-zinc-400 hover:text-white">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
