"use client";

import { useState } from "react";
import { saveBrandContentSection } from "@/app/admin/(dashboard)/content/actions";
import { SaveSubmitButton } from "@/components/ui/SaveSubmitButton";
import type { BrandSectionKey } from "@/lib/brand-content";

type SectionData = {
  sectionKey: BrandSectionKey;
  label: string;
  title: string;
  content: string;
  jsonData: string;
  hint?: string;
};

export function BrandContentEditor({ sections }: { sections: SectionData[] }) {
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <form
          key={s.sectionKey}
          action={async (fd) => {
            await saveBrandContentSection(fd);
            setSaved(s.sectionKey);
          }}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="sectionKey" value={s.sectionKey} />
          <h3 className="text-sm font-semibold text-zinc-900">{s.label}</h3>
          {s.hint ? <p className="mt-1 text-xs text-zinc-500">{s.hint}</p> : null}
          <label className="mt-4 block text-xs font-semibold text-zinc-600">
            Title
            <input
              name="title"
              defaultValue={s.title}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-zinc-600">
            Content
            <textarea
              name="content"
              defaultValue={s.content}
              rows={s.jsonData ? 4 : 8}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono leading-relaxed"
            />
          </label>
          {s.jsonData ? (
            <label className="mt-3 block text-xs font-semibold text-zinc-600">
              JSON data
              <textarea
                name="jsonData"
                defaultValue={s.jsonData}
                rows={8}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-mono"
              />
            </label>
          ) : (
            <input type="hidden" name="jsonData" value="" />
          )}
          <SaveSubmitButton
            idleLabel="Save section"
            savingLabel="Saving…"
            className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white hover:bg-black"
          />
          {saved === s.sectionKey ? (
            <span className="ml-3 text-xs font-medium text-emerald-700">Saved</span>
          ) : null}
        </form>
      ))}
    </div>
  );
}
