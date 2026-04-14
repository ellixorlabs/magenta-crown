"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { createDefaultHomePagePayload } from "@/lib/home-page-defaults";
import type { HomePagePayloadV1, HomeSectionConfig } from "@/lib/home-page-types";
import { SECTION_TYPE_LABELS, templateSection } from "@/lib/home-page-templates";
import { saveHomePageConfig } from "./actions";

type Props = {
  initial: HomePagePayloadV1;
};

export function HomePageBlocksEditor({ initial }: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<HomePagePayloadV1>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      setPayload((p) => {
        const ids = p.sections.map((s) => s.id);
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) return p;
        return { ...p, sections: arrayMove(p.sections, oldIndex, newIndex) };
      });
    },
    []
  );

  function updateSection(id: string, next: HomeSectionConfig) {
    setPayload((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === id ? next : s))
    }));
  }

  function removeSection(id: string) {
    setPayload((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== id) }));
  }

  function addSection(type: HomeSectionConfig["type"]) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sec_${Date.now()}`;
    setPayload((p) => ({
      ...p,
      sections: [...p.sections, templateSection(type, id)]
    }));
  }

  async function publish() {
    setError(null);
    setPending(true);
    try {
      await saveHomePageConfig(payload);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  function resetDefaults() {
    if (!confirm("Replace the homepage with the built-in default layout?")) return;
    setPayload(createDefaultHomePagePayload());
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
        <p className="font-semibold">Drag & drop blocks</p>
        <p className="mt-1 text-xs">
          Grab the handle on the left to reorder sections. Expand each block to edit text and images. Hero backgrounds
          still use <strong>Homepage hero</strong> slides in admin. Click <strong>Save & publish</strong> when done.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-zinc-600">Add block:</span>
        <select
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as HomeSectionConfig["type"] | "";
            e.target.value = "";
            if (v) addSection(v);
          }}
        >
          <option value="">Choose type…</option>
          {SECTION_TYPE_LABELS.map((o) => (
            <option key={o.type} value={o.type}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={resetDefaults}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800"
        >
          Reset to defaults
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={payload.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {payload.sections.map((section) => (
              <SortableSectionCard
                key={section.id}
                section={section}
                onChange={updateSection}
                onRemove={removeSection}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-zinc-500">{payload.sections.length} sections (unsaved until you publish).</p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => void publish()}
          className="rounded-full bg-crown-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-crown-900 disabled:opacity-50"
        >
          {pending ? "Publishing…" : "Save & publish to site"}
        </button>
        <a href="/" className="rounded-full border border-zinc-300 bg-white px-6 py-2.5 text-sm text-zinc-800">
          View storefront
        </a>
      </div>
    </div>
  );
}

function SortableSectionCard({
  section,
  onChange,
  onRemove
}: {
  section: HomeSectionConfig;
  onChange: (id: string, next: HomeSectionConfig) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1
  };
  const label = SECTION_TYPE_LABELS.find((x) => x.type === section.type)?.label ?? section.type;

  return (
    <li ref={setNodeRef} style={style} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-stretch gap-0">
        <button
          type="button"
          className="flex w-11 shrink-0 cursor-grab items-center justify-center rounded-l-2xl border-r border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <span className="text-lg leading-none">⋮⋮</span>
        </button>
        <details className="min-w-0 flex-1 group-open:bg-zinc-50/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 pr-3 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
              <p className="truncate text-sm font-medium text-zinc-900">
                {section.type === "hero"
                  ? "Hero carousel"
                  : "title" in section && typeof section.title === "string"
                    ? section.title
                    : section.id}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={(e) => onChange(section.id, { ...section, enabled: e.target.checked })}
                  onClick={(e) => e.stopPropagation()}
                />
                On
              </label>
              <button
                type="button"
                className="rounded-full px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.preventDefault();
                  onRemove(section.id);
                }}
              >
                Remove
              </button>
              <span className="text-zinc-400 text-xs">▾</span>
            </div>
          </summary>
          <div className="border-t border-zinc-100 px-4 py-4">
            <SectionFields section={section} onChange={(next) => onChange(section.id, next)} />
          </div>
        </details>
      </div>
    </li>
  );
}

function SectionFields({
  section,
  onChange
}: {
  section: HomeSectionConfig;
  onChange: (next: HomeSectionConfig) => void;
}) {
  const uid = useId();

  const transition = (
    <label className="block text-xs font-semibold text-zinc-600">
      Transition
      <select
        className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        value={section.transition}
        onChange={(e) =>
          onChange({ ...section, transition: e.target.value as HomeSectionConfig["transition"] })
        }
      >
        <option value="fade">fade</option>
        <option value="slide">slide</option>
        <option value="zoom">zoom</option>
        <option value="none">none</option>
      </select>
    </label>
  );

  switch (section.type) {
    case "hero":
      return (
        <div className="space-y-3">
          {transition}
          <label className="block text-xs font-semibold text-zinc-600">
            Carousel mode
            <select
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              value={section.carousel}
              onChange={(e) =>
                onChange({ ...section, carousel: e.target.value as "fade" | "slide" })
              }
            >
              <option value="fade">fade</option>
              <option value="slide">slide</option>
            </select>
          </label>
        </div>
      );
    case "categoryGrid":
      return (
        <div className="space-y-3">
          {transition}
          <Field
            label="Eyebrow"
            value={section.eyebrow}
            onChange={(eyebrow) => onChange({ ...section, eyebrow })}
          />
          <Field label="Title" value={section.title} onChange={(title) => onChange({ ...section, title })} />
          <p className="text-xs font-semibold text-zinc-600">Category cards</p>
          <ul className="space-y-2">
            {section.items.map((it, i) => (
              <li key={i} className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
                <Field
                  label="Title"
                  value={it.title}
                  onChange={(title) => {
                    const items = [...section.items];
                    items[i] = { ...items[i]!, title };
                    onChange({ ...section, items });
                  }}
                />
                <Field
                  label="Link (href)"
                  value={it.href}
                  onChange={(href) => {
                    const items = [...section.items];
                    items[i] = { ...items[i]!, href };
                    onChange({ ...section, items });
                  }}
                />
                <Field
                  label="Image URL"
                  value={it.imageUrl}
                  onChange={(imageUrl) => {
                    const items = [...section.items];
                    items[i] = { ...items[i]!, imageUrl };
                    onChange({ ...section, items });
                  }}
                />
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-red-600"
                  onClick={() =>
                    onChange({
                      ...section,
                      items: section.items.filter((_, j) => j !== i)
                    })
                  }
                >
                  Remove card
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="text-sm font-semibold text-crown-800 underline"
            onClick={() =>
              onChange({
                ...section,
                items: [
                  ...section.items,
                  { title: "New", href: "/shop", imageUrl: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=900&q=80" }
                ]
              })
            }
          >
            + Add card
          </button>
        </div>
      );
    case "priceShop":
      return (
        <div className="space-y-3">
          {transition}
          <Field label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <Field label="Title" value={section.title} onChange={(title) => onChange({ ...section, title })} />
          {section.buckets.map((b, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-3">
              <Field
                label={`Range ${i + 1} label`}
                value={b.label}
                onChange={(label) => {
                  const buckets = [...section.buckets];
                  buckets[i] = { ...buckets[i]!, label };
                  onChange({ ...section, buckets });
                }}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs text-zinc-600">
                  Min price
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                    value={b.minPrice ?? ""}
                    onChange={(e) => {
                      const buckets = [...section.buckets];
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      buckets[i] = { ...buckets[i]!, minPrice: v };
                      onChange({ ...section, buckets });
                    }}
                  />
                </label>
                <label className="text-xs text-zinc-600">
                  Max price
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                    value={b.maxPrice ?? ""}
                    onChange={(e) => {
                      const buckets = [...section.buckets];
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      buckets[i] = { ...buckets[i]!, maxPrice: v };
                      onChange({ ...section, buckets });
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      );
    case "newArrivals":
    case "bestsellers":
      return (
        <div className="space-y-3">
          {transition}
          <Field label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <Field label="Title" value={section.title} onChange={(title) => onChange({ ...section, title })} />
          <label className="block text-xs font-semibold text-zinc-600">
            Product count
            <input
              type="number"
              min={1}
              max={24}
              className="mt-1 w-24 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              value={section.count}
              onChange={(e) => onChange({ ...section, count: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
        </div>
      );
    case "productStory":
      return (
        <div className="space-y-3">
          {transition}
          <Field label="Image URL" value={section.imageUrl} onChange={(imageUrl) => onChange({ ...section, imageUrl })} />
          <Field label="Image alt" value={section.imageAlt} onChange={(imageAlt) => onChange({ ...section, imageAlt })} />
          <Field label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <Field label="Title" value={section.title} onChange={(title) => onChange({ ...section, title })} />
          <label className="block text-xs font-semibold text-zinc-600">
            Body
            <textarea
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
              rows={3}
              value={section.body}
              onChange={(e) => onChange({ ...section, body: e.target.value })}
            />
          </label>
          <Field
            label="Bullets (one per line)"
            value={section.bullets.join("\n")}
            onChange={(t) => onChange({ ...section, bullets: t.split("\n").map((x) => x.trim()).filter(Boolean) })}
            multiline
          />
          <Field label="CTA label" value={section.ctaLabel} onChange={(ctaLabel) => onChange({ ...section, ctaLabel })} />
          <Field label="CTA link" value={section.ctaHref} onChange={(ctaHref) => onChange({ ...section, ctaHref })} />
        </div>
      );
    case "brandEthos":
      return (
        <div className="space-y-3">
          {transition}
          {section.columns.map((col, i) => (
            <div key={`${uid}-ethos-${i}`} className="rounded-lg border border-zinc-200 p-3">
              <Field
                label="Label"
                value={col.label}
                onChange={(label) => {
                  const columns = [...section.columns];
                  columns[i] = { ...columns[i]!, label };
                  onChange({ ...section, columns });
                }}
              />
              <label className="mt-2 block text-xs font-semibold text-zinc-600">
                Body
                <textarea
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  rows={2}
                  value={col.body}
                  onChange={(e) => {
                    const columns = [...section.columns];
                    columns[i] = { ...columns[i]!, body: e.target.value };
                    onChange({ ...section, columns });
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      );
    case "testimonials":
      return (
        <div className="space-y-3">
          {transition}
          <Field label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <Field label="Title" value={section.title} onChange={(title) => onChange({ ...section, title })} />
          {section.quotes.map((q, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-3">
              <Field
                label="Name"
                value={q.name}
                onChange={(name) => {
                  const quotes = [...section.quotes];
                  quotes[i] = { ...quotes[i]!, name };
                  onChange({ ...section, quotes });
                }}
              />
              <label className="mt-2 block text-xs font-semibold text-zinc-600">
                Quote
                <textarea
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  rows={2}
                  value={q.text}
                  onChange={(e) => {
                    const quotes = [...section.quotes];
                    quotes[i] = { ...quotes[i]!, text: e.target.value };
                    onChange({ ...section, quotes });
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      );
    case "socialGallery":
      return (
        <div className="space-y-3">
          {transition}
          <Field label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <Field label="Title" value={section.title} onChange={(title) => onChange({ ...section, title })} />
          <Field
            label="Subtitle"
            value={section.subtitle}
            onChange={(subtitle) => onChange({ ...section, subtitle })}
          />
          <Field
            label="Image URLs (one per line)"
            value={section.images.join("\n")}
            onChange={(t) =>
              onChange({
                ...section,
                images: t.split("\n").map((x) => x.trim()).filter(Boolean)
              })
            }
            multiline
          />
        </div>
      );
    case "newsletter":
      return (
        <div className="space-y-3">
          {transition}
          <Field label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <Field label="Title" value={section.title} onChange={(title) => onChange({ ...section, title })} />
          <Field
            label="Subtitle"
            value={section.subtitle}
            onChange={(subtitle) => onChange({ ...section, subtitle })}
          />
        </div>
      );
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}

function Field({
  label,
  value,
  onChange,
  multiline
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold text-zinc-600">
      {label}
      {multiline ? (
        <textarea
          className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm font-mono text-xs"
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
