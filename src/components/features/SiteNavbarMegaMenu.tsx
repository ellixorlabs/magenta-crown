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
  const panelLight =
    "border-zinc-300/90 bg-gradient-to-b from-white via-zinc-50 to-zinc-100/95 text-zinc-950 shadow-2xl ring-1 ring-zinc-900/[0.07]";
  const panelDark =
    "border-white/20 bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950 text-zinc-50 shadow-2xl ring-1 ring-white/10";

  const linkLight = "text-zinc-950 hover:bg-zinc-200/80";
  const linkDark = "text-zinc-50 hover:bg-white/12";

  return (
    <div className="relative z-[20]">
      <button
        type="button"
        className={`flex items-center gap-0.5 rounded-md py-2 font-[family-name:var(--font-body)] text-[11px] font-semibold uppercase tracking-[0.2em] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-crown-500 ${
          isLight ? "text-zinc-900" : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
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
          className="absolute left-0 top-full z-[1000] min-w-[13rem] pt-2"
          onMouseEnter={onPanelPointerEnter}
          role="menu"
        >
          <div className={`rounded-xl border p-2 backdrop-blur-md ${isLight ? panelLight : panelDark}`}>
            {links.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                role="menuitem"
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${isLight ? linkLight : linkDark}`}
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
