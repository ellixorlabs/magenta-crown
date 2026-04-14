"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

type LinkItem = { label: string; href: string };

export function SiteNavbarMegaMenu({
  title,
  links,
  isLight,
  isOpen,
  onOpen,
  onPanelPointerEnter
}: {
  title: string;
  links: LinkItem[];
  isLight: boolean;
  /** Controlled by parent so only one mega menu is open at a time. */
  isOpen: boolean;
  onOpen: () => void;
  /** Keeps menu open while cursor is over the dropdown panel. */
  onPanelPointerEnter: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        className={`flex items-center gap-0.5 rounded-md py-2 font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.2em] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-crown-500 ${
          isLight ? "text-zinc-900" : "text-white drop-shadow-sm"
        }`}
        onMouseEnter={onOpen}
        onFocus={onOpen}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {title}
        <ChevronDown className="h-3 w-3 opacity-80" />
      </button>
      {isOpen && (
        <div
          className="absolute left-0 top-full z-[100] min-w-[13rem] pt-2"
          onMouseEnter={onPanelPointerEnter}
          role="menu"
        >
          <div
            className={`rounded-xl border p-2 shadow-2xl ${
              isLight
                ? "border-zinc-200/90 bg-white/98 backdrop-blur-xl"
                : "border-white/15 bg-zinc-950/95 backdrop-blur-xl"
            }`}
          >
            {links.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                role="menuitem"
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  isLight ? "text-zinc-800 hover:bg-zinc-100" : "text-zinc-100 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
