"use client";

import { Minus, Plus } from "lucide-react";
import { useLayoutEffect, useState } from "react";

function labelClass(bar: boolean, compact: boolean) {
  if (bar) return "text-[10px] font-semibold uppercase tracking-wider text-zinc-600";
  if (compact) return "text-[11px] font-semibold uppercase tracking-wide text-zinc-700";
  return "font-semibold text-zinc-900";
}

type Props = {
  /** Stable id fragment for `aria-controls` / section panel. */
  sectionKey: string;
  title: string;
  bar: boolean;
  compact: boolean;
  /** When true, section opens (or stays open) so active filters stay visible. */
  selectionActive?: boolean;
  /** Initial open state. Default collapsed. */
  defaultOpen?: boolean;
  showClear?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
};

export function CollapsibleFilterSection({
  sectionKey,
  title,
  bar,
  compact,
  selectionActive = false,
  defaultOpen = false,
  showClear,
  onClear,
  children
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const lab = labelClass(bar, compact);
  const panelId = `filter-section-${sectionKey}`;

  useLayoutEffect(() => {
    if (selectionActive) setOpen(true);
  }, [selectionActive]);

  return (
    <div className={bar ? "min-w-0 w-full" : ""}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span id={`${panelId}-label`} className={`min-w-0 ${lab}`}>
            {title}
          </span>
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded p-0.5 text-zinc-600 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <Minus className="h-4 w-4" strokeWidth={2.25} /> : <Plus className="h-4 w-4" strokeWidth={2.25} />}
          </button>
        </div>
        {showClear && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-crown-800 hover:text-crown-950"
          >
            Clear
          </button>
        ) : null}
      </div>
      {open ? (
        <div id={panelId} className="mt-2" role="region" aria-labelledby={`${panelId}-label`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
