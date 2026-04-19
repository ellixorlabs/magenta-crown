"use client";

import type { Product } from "@prisma/client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { createDefaultHomePagePayloadV2 } from "@/lib/home-page-defaults";
import type { DynamicProductSection, HomePagePayloadV2, SectionTransition } from "@/lib/home-page-types";
import { randomId } from "@/lib/random-id";
import { saveHomePageConfig } from "./actions";

export type CatalogProduct = Pick<Product, "id" | "name" | "slug" | "category">;

type Props = {
  initial: HomePagePayloadV2;
  catalogProducts: CatalogProduct[];
};

function normalizeOrders(sections: DynamicProductSection[]): DynamicProductSection[] {
  const sorted = [...sections].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return sorted.map((s, i) => ({ ...s, order: i }));
}

export function HomePageV2Editor({ initial, catalogProducts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [payload, setPayload] = useState<HomePagePayloadV2>(() => ({
    ...initial,
    sections: normalizeOrders(initial.sections)
  }));
  const [error, setError] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState("");
  const [openSectionId, setOpenSectionId] = useState<string | null>(initial.sections[0]?.id ?? null);

  const filteredCatalog = useMemo(() => {
    const q = productFilter.trim().toLowerCase();
    if (!q) return catalogProducts;
    return catalogProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [catalogProducts, productFilter]);

  const publish = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        await saveHomePageConfig(payload);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }, [payload, router]);

  const setHeroEnabled = useCallback((enabled: boolean) => {
    setPayload((p) => ({ ...p, hero: { enabled } }));
  }, []);

  const addSection = useCallback(() => {
    setPayload((p) => {
      const next: DynamicProductSection = {
        id: `section-${randomId()}`,
        title: "New section",
        eyebrow: "Shop",
        type: "carousel",
        enabled: true,
        order: p.sections.length,
        productIds: [],
        transition: "fade",
        viewAllHref: "/shop"
      };
      const sections = normalizeOrders([...p.sections, next]);
      setOpenSectionId(next.id);
      return { ...p, sections };
    });
  }, []);

  const removeSection = useCallback((id: string) => {
    if (!confirm("Remove this section from the homepage?")) return;
    setPayload((p) => ({
      ...p,
      sections: normalizeOrders(p.sections.filter((s) => s.id !== id))
    }));
    setOpenSectionId((cur) => (cur === id ? null : cur));
  }, []);

  const moveSection = useCallback((id: string, dir: -1 | 1) => {
    setPayload((p) => {
      const sorted = normalizeOrders(p.sections);
      const idx = sorted.findIndex((s) => s.id === id);
      if (idx < 0) return p;
      const j = idx + dir;
      if (j < 0 || j >= sorted.length) return p;
      const copy = [...sorted];
      [copy[idx], copy[j]] = [copy[j]!, copy[idx]!];
      return { ...p, sections: normalizeOrders(copy) };
    });
  }, []);

  const patchSection = useCallback((id: string, patch: Partial<DynamicProductSection>) => {
    setPayload((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === id ? { ...s, ...patch } : s))
    }));
  }, []);

  const toggleProduct = useCallback((sectionId: string, productId: string, checked: boolean) => {
    setPayload((p) => ({
      ...p,
      sections: p.sections.map((s) => {
        if (s.id !== sectionId) return s;
        if (checked) {
          if (s.productIds.includes(productId)) return s;
          return { ...s, productIds: [...s.productIds, productId] };
        }
        return { ...s, productIds: s.productIds.filter((x) => x !== productId) };
      })
    }));
  }, []);

  const resetDefaults = useCallback(() => {
    if (!confirm("Replace homepage config with a fresh default (one disabled starter section)?")) return;
    setPayload(createDefaultHomePagePayloadV2());
    setError(null);
  }, []);

  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-zinc-900">Hero</p>
        <p className="mt-1 break-words text-xs leading-relaxed text-zinc-600">
          Slides are edited under <strong>Homepage hero</strong>. This toggle only shows or hides the hero on the live
          home page.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            checked={payload.hero.enabled}
            onChange={(e) => setHeroEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-400"
          />
          Show hero on homepage
        </label>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addSection}
          className="rounded-full bg-crown-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-crown-900"
        >
          + Add section
        </button>
        <button
          type="button"
          onClick={resetDefaults}
          className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50"
        >
          Reset to default layout
        </button>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="min-w-0 break-words text-sm font-medium text-crown-800 underline"
        >
          Open storefront
        </a>
      </div>

      <ul className="min-w-0 space-y-4">
        {normalizeOrders(payload.sections).map((section, index, arr) => (
          <li key={section.id} className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex min-w-0 flex-wrap items-stretch gap-0 border-b border-zinc-100 bg-zinc-50/80">
              <div className="flex shrink-0 border-r border-zinc-200">
                <button
                  type="button"
                  className="px-3 py-3 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => moveSection(section.id, -1)}
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="px-3 py-3 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                  aria-label="Move down"
                  disabled={index === arr.length - 1}
                  onClick={() => moveSection(section.id, 1)}
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
              <button
                type="button"
                className="min-w-0 flex-1 basis-[min(100%,12rem)] px-4 py-3 text-left"
                onClick={() => setOpenSectionId((o) => (o === section.id ? null : section.id))}
              >
                <p className="break-words text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {section.type === "carousel" ? "Carousel" : "Grid"} · order {section.order}
                </p>
                <p className="break-words font-medium text-zinc-900">{section.title}</p>
                <p className="text-xs text-zinc-500">{section.productIds.length} product(s)</p>
              </button>
              <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-l border-zinc-200 px-3 py-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={(e) => patchSection(section.id, { enabled: e.target.checked })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  On
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:underline"
                  onClick={() => removeSection(section.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            {openSectionId === section.id && (
              <div className="min-w-0 space-y-5 overflow-x-hidden p-5">
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <label className="block min-w-0 text-xs font-semibold text-zinc-600">
                    Title
                    <input
                      type="text"
                      className="mt-1 box-border min-h-10 w-full min-w-0 max-w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={section.title}
                      onChange={(e) => patchSection(section.id, { title: e.target.value })}
                    />
                  </label>
                  <label className="block min-w-0 text-xs font-semibold text-zinc-600">
                    Eyebrow
                    <input
                      type="text"
                      className="mt-1 box-border min-h-10 w-full min-w-0 max-w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={section.eyebrow}
                      onChange={(e) => patchSection(section.id, { eyebrow: e.target.value })}
                    />
                  </label>
                </div>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <label className="block min-w-0 text-xs font-semibold text-zinc-600">
                    Layout
                    <select
                      className="mt-1 box-border min-h-10 w-full min-w-0 max-w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={section.type}
                      onChange={(e) => patchSection(section.id, { type: e.target.value as "carousel" | "grid" })}
                    >
                      <option value="carousel">Carousel</option>
                      <option value="grid">Grid</option>
                    </select>
                  </label>
                  <label className="block min-w-0 text-xs font-semibold text-zinc-600">
                    Transition
                    <select
                      className="mt-1 box-border min-h-10 w-full min-w-0 max-w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={section.transition}
                      onChange={(e) =>
                        patchSection(section.id, { transition: e.target.value as SectionTransition })
                      }
                    >
                      <option value="fade">fade</option>
                      <option value="slide">slide</option>
                      <option value="zoom">zoom</option>
                      <option value="none">none</option>
                    </select>
                  </label>
                </div>
                <label className="block text-xs font-semibold text-zinc-600">
                  View all link (optional)
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono text-xs"
                    placeholder="/shop"
                    value={section.viewAllHref ?? ""}
                    onChange={(e) => patchSection(section.id, { viewAllHref: e.target.value.trim() || undefined })}
                  />
                </label>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-700">Products</p>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-500">
                    Check products to include. Order follows selection order on first add; use list order for display
                    sequence.
                  </p>
                  <input
                    type="search"
                    className="mt-2 box-border min-h-10 w-full min-w-0 max-w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Filter by name, slug, category…"
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                  />
                  <div className="mt-3 max-h-[min(360px,50vh)] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-zinc-50/50 p-2">
                    <ul className="min-w-0 divide-y divide-zinc-100">
                      {filteredCatalog.map((p) => (
                        <li key={p.id} className="flex min-w-0 items-start gap-3 py-2 pl-1 pr-2">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-400"
                            checked={section.productIds.includes(p.id)}
                            onChange={(e) => toggleProduct(section.id, p.id, e.target.checked)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium text-zinc-900">{p.name}</p>
                            <p className="break-all text-xs text-zinc-500">{p.category} · {p.slug}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {filteredCatalog.length === 0 && (
                      <p className="py-6 text-center text-sm text-zinc-500">No products match this filter.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {payload.sections.length === 0 && (
        <p className="break-words rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm leading-relaxed text-zinc-600">
          No sections yet. Click <strong>Add section</strong> to create one.
        </p>
      )}

      {error && (
        <p className="break-words text-sm leading-relaxed text-red-600">{error}</p>
      )}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          disabled={isPending}
          onClick={() => void publish()}
          className="w-fit shrink-0 rounded-full bg-crown-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-crown-900 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save & publish"}
        </button>
        <p className="min-w-0 max-w-prose break-words text-xs leading-relaxed text-zinc-500">
          Saves to the database and refreshes the storefront (no full reload).
        </p>
      </div>
    </div>
  );
}
