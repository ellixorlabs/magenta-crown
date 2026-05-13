"use client";

import { useMemo } from "react";
import { buildCategoryFilterGroups } from "@/lib/shop-category-tree";

type Props = {
  categories: readonly string[];
  selected: string[];
  compact: boolean;
  bar: boolean;
  onToggle: (value: string) => void;
};

/**
 * Category checkboxes only (no section header). Parent wraps with `CollapsibleFilterSection`.
 * Hierarchy from ` > ` in labels: children always shown indented under parent — no per-row expand.
 */
export function CategoryFilterTree({ categories, selected, compact, bar, onToggle }: Props) {
  const groups = useMemo(() => buildCategoryFilterGroups(categories), [categories]);

  const scrollClass = bar
    ? "max-h-28 overflow-y-auto sm:max-h-32"
    : compact
      ? "max-h-40 overflow-y-auto"
      : "max-h-52 overflow-y-auto";

  const textRow = compact ? "text-xs leading-snug text-zinc-800" : bar ? "text-xs leading-snug text-zinc-800" : "text-sm leading-snug text-zinc-800";

  return (
    <fieldset className={["m-0 min-w-0 border-0 bg-transparent p-0", scrollClass].join(" ")}>
      <legend className="sr-only">Category</legend>
      {groups.length === 0 ? (
        <p className="text-xs text-zinc-500">No values yet</p>
      ) : (
        <div className={bar ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}>
          {groups.map((g, gi) => {
            const hasChildren = g.childEntries.length > 0;
            const rootChecked = g.rootLeafValue != null && selected.includes(g.rootLeafValue);
            const anyChildChecked = g.childEntries.some((c) => selected.includes(c.fullValue));
            const rowActive = rootChecked || anyChildChecked;
            const rootInputId = `category-root-${gi}`;

            return (
              <div key={g.rootKey} className="rounded-md">
                <div
                  className={`flex items-start gap-2 rounded-md px-1 py-0.5 hover:bg-zinc-50 ${rowActive ? "bg-zinc-100/80" : ""}`}
                >
                  {g.rootLeafValue != null ? (
                    <label htmlFor={rootInputId} className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                      <input
                        id={rootInputId}
                        type="checkbox"
                        checked={rootChecked}
                        onChange={() => onToggle(g.rootLeafValue!)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400 accent-zinc-950"
                      />
                      <span className={`min-w-0 flex-1 break-words ${textRow}`}>{g.rootKey}</span>
                    </label>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start gap-2 pl-0.5">
                      <span className={`min-w-0 flex-1 break-words font-medium ${textRow}`}>{g.rootKey}</span>
                    </div>
                  )}
                </div>

                {hasChildren ? (
                  <div className="mt-1 space-y-1 border-l border-zinc-200/90 pl-3 ml-1.5">
                    {g.childEntries.map((ch, ci) => {
                      const id = `category-sub-${gi}-${ci}`;
                      const isOn = selected.includes(ch.fullValue);
                      return (
                        <label
                          key={ch.fullValue}
                          htmlFor={id}
                          className={`flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 hover:bg-zinc-50 ${isOn ? "bg-zinc-100/80" : ""}`}
                        >
                          <input
                            id={id}
                            type="checkbox"
                            checked={isOn}
                            onChange={() => onToggle(ch.fullValue)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400 accent-zinc-950"
                          />
                          <span className={`min-w-0 flex-1 break-words ${textRow}`}>{ch.displayLabel}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
