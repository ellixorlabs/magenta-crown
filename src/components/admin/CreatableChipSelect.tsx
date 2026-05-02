"use client";

import { useMemo, useState } from "react";

type Props = {
  label: string;
  name: string;
  initialSelected: string[];
  options: string[];
  multiple?: boolean;
  placeholder?: string;
};

function uniq(values: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values.map((x) => x.trim()).filter(Boolean)) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export function CreatableChipSelect({
  label,
  name,
  initialSelected,
  options,
  multiple = true,
  placeholder = "Type and press Enter"
}: Props) {
  const [selected, setSelected] = useState<string[]>(() => {
    const normalized = uniq(initialSelected);
    return multiple ? normalized : normalized.slice(0, 1);
  });
  const [query, setQuery] = useState("");

  const optionPool = useMemo(() => uniq(options), [options]);
  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return optionPool
      .filter((opt) => !selected.some((s) => s.toLowerCase() === opt.toLowerCase()))
      .filter((opt) => opt.toLowerCase().includes(q))
      .slice(0, 8);
  }, [optionPool, query, selected]);

  const hiddenValue = multiple ? selected.join(", ") : (selected[0] ?? "");

  const addValue = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setSelected((prev) => {
      if (!multiple) return [v];
      if (prev.some((x) => x.toLowerCase() === v.toLowerCase())) return prev;
      return [...prev, v];
    });
    setQuery("");
  };

  return (
    <div className="sm:col-span-2">
      <input type="hidden" name={name} value={hiddenValue} />
      <label className="text-xs font-semibold text-zinc-600">{label}</label>

      <div className="mt-1 rounded-xl border border-zinc-300 bg-white p-2">
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-800"
            >
              {item}
              <button
                type="button"
                className="text-zinc-500 hover:text-red-600"
                onClick={() => setSelected((prev) => prev.filter((x) => x !== item))}
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addValue(query);
              }
              if (e.key === "Backspace" && !query && selected.length > 0) {
                setSelected((prev) => prev.slice(0, -1));
              }
            }}
            placeholder={selected.length === 0 ? placeholder : "Add more"}
            className="min-w-[12rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
          />
        </div>

        {visibleOptions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2 border-t border-zinc-100 pt-2">
            {visibleOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => addValue(opt)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

