"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import type { ProductRow } from "@/lib/db/app-types";
import { createDefaultHomePagePayloadV2 } from "@/lib/home-page-defaults";
import type {
  DynamicHomeSection,
  DynamicPromoBannerSection,
  DynamicProductSection,
  HomeCategoryCircleItem,
  HomePagePayloadV2,
  SectionTransition
} from "@/lib/home-page-types";
import { randomId } from "@/lib/random-id";
import { saveHomePageConfig } from "./actions";

export type CatalogProduct = Pick<ProductRow, "id" | "name" | "slug" | "category">;

type Props = {
  initial: HomePagePayloadV2;
  catalogProducts: CatalogProduct[];
};

function normalizeOrders(sections: DynamicHomeSection[]): DynamicHomeSection[] {
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
  const [productFilter, setProductFilter] = useState<string>("");
  const [openSectionId, setOpenSectionId] = useState<string | null>(initial.sections[0]?.id ?? null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [draggingCircleId, setDraggingCircleId] = useState<string | null>(null);

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
  const categoryOptions = useMemo(
    () =>
      [
        ...new Set(
          [
            ...catalogProducts.map((p) => p.category.trim()),
            ...payload.categoryCircles.items
              .filter((it) => it.targetType === "category")
              .map((it) => it.targetValue.trim())
          ].filter(Boolean)
        )
      ].sort((a, b) => a.localeCompare(b)),
    [catalogProducts, payload.categoryCircles.items]
  );

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

  const addPromoBannerSection = useCallback(() => {
    setPayload((p) => {
      const next: DynamicPromoBannerSection = {
        id: `section-${randomId()}`,
        type: "promoBanner",
        enabled: true,
        order: p.sections.length,
        transition: "fade",
        title: "Shop by the Occasion",
        subtitle: "Elegance crafted for your special moments.",
        imageUrl: "",
        targetHref: "/shop",
        gradientFrom: "#7f1530",
        gradientTo: "#a0173c"
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

  const reorderSectionByDrop = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setPayload((p) => {
      const sorted = normalizeOrders(p.sections);
      const from = sorted.findIndex((s) => s.id === fromId);
      const to = sorted.findIndex((s) => s.id === toId);
      if (from < 0 || to < 0) return p;
      const copy = [...sorted];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved!);
      return { ...p, sections: normalizeOrders(copy) };
    });
  }, []);

  const patchSection = useCallback((id: string, patch: Partial<DynamicHomeSection>) => {
    setPayload((p): HomePagePayloadV2 => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === id ? ({ ...s, ...patch } as DynamicHomeSection) : s
      )
    }));
  }, []);

  const toggleProduct = useCallback((sectionId: string, productId: string, checked: boolean) => {
    setPayload((p) => ({
      ...p,
      sections: p.sections.map((s) => {
        if (s.id !== sectionId) return s;
        if (s.type === "promoBanner") return s;
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

  const addCircle = useCallback(() => {
    setPayload((p) => ({
      ...p,
      categoryCircles: {
        ...p.categoryCircles,
        items: [
          ...p.categoryCircles.items,
          {
            id: `circle-${randomId()}`,
            label: "New circle",
            imageUrl: "",
            targetType: "customUrl",
            targetValue: "/shop"
          }
        ]
      }
    }));
  }, []);

  const patchCircle = useCallback((id: string, patch: Partial<HomeCategoryCircleItem>) => {
    setPayload((p) => ({
      ...p,
      categoryCircles: {
        ...p.categoryCircles,
        items: p.categoryCircles.items.map((it) => (it.id === id ? { ...it, ...patch } : it))
      }
    }));
  }, []);

  const removeCircle = useCallback((id: string) => {
    setPayload((p) => ({
      ...p,
      categoryCircles: {
        ...p.categoryCircles,
        items: p.categoryCircles.items.filter((it) => it.id !== id)
      }
    }));
  }, []);

  const reorderCircleByDrop = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setPayload((p) => {
      const from = p.categoryCircles.items.findIndex((it) => it.id === fromId);
      const to = p.categoryCircles.items.findIndex((it) => it.id === toId);
      if (from < 0 || to < 0) return p;
      const copy = [...p.categoryCircles.items];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved!);
      return { ...p, categoryCircles: { ...p.categoryCircles, items: copy } };
    });
  }, []);

  const uploadPromoImage = useCallback(async (sectionId: string, file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sectionId", sectionId);
      const res = await fetch("/api/admin/homepage-image", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string; error?: string };
      const url = typeof json.url === "string" ? json.url.trim() : "";
      if (!res.ok || !url) {
        throw new Error(json.error || "Upload failed.");
      }
      const nextPayload: HomePagePayloadV2 = {
        ...payload,
        sections: payload.sections.map((s): DynamicHomeSection => {
          if (s.id !== sectionId || s.type !== "promoBanner") return s;
          return { ...s, imageUrl: url };
        })
      };
      setPayload(nextPayload);
      await saveHomePageConfig(nextPayload);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }, [payload, router]);

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

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Category circles</p>
            <p className="mt-1 text-xs text-zinc-600">
              Circular image links for categories or custom URLs.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={payload.categoryCircles.enabled}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  categoryCircles: { ...p.categoryCircles, enabled: e.target.checked }
                }))
              }
            />
            Enabled
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-zinc-600">
            Eyebrow
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={payload.categoryCircles.eyebrow}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  categoryCircles: { ...p.categoryCircles, eyebrow: e.target.value }
                }))
              }
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-600">
            Title
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={payload.categoryCircles.title}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  categoryCircles: { ...p.categoryCircles, title: e.target.value }
                }))
              }
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-600">
            Shape
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={payload.categoryCircles.shape}
              onChange={(e) =>
                setPayload((p) => ({
                  ...p,
                  categoryCircles: {
                    ...p.categoryCircles,
                    shape: e.target.value as "circle" | "square" | "rectangle"
                  }
                }))
              }
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="rectangle">Rectangle</option>
            </select>
          </label>
        </div>
        <div className="mt-4 space-y-3">
          {payload.categoryCircles.items.map((it) => (
            <div
              key={it.id}
              draggable
              onDragStart={() => setDraggingCircleId(it.id)}
              onDragEnd={() => setDraggingCircleId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingCircleId) reorderCircleByDrop(draggingCircleId, it.id);
              }}
              className={`rounded-xl border bg-zinc-50/60 p-3 ${draggingCircleId === it.id ? "border-crown-400" : "border-zinc-200"}`}
            >
              <div className="grid gap-3 sm:grid-cols-4">
                <label className="block text-xs font-semibold text-zinc-600">
                  Label
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={it.label}
                    onChange={(e) => patchCircle(it.id, { label: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-semibold text-zinc-600">
                  Image URL
                  <input
                    type="url"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={it.imageUrl}
                    onChange={(e) => patchCircle(it.id, { imageUrl: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-semibold text-zinc-600">
                  Redirect type
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    value={it.targetType}
                    onChange={(e) =>
                      patchCircle(it.id, {
                        targetType: e.target.value as "category" | "shopFilter" | "customUrl"
                      })
                    }
                  >
                    <option value="category">Category</option>
                    <option value="shopFilter">Shop filter</option>
                    <option value="customUrl">Custom URL</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-zinc-600">
                  Redirect value
                  {it.targetType === "category" ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={it.targetValue}
                      onChange={(e) => patchCircle(it.id, { targetValue: e.target.value })}
                    >
                      <option value="">Select category</option>
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={it.targetValue}
                      onChange={(e) => patchCircle(it.id, { targetValue: e.target.value })}
                      placeholder={it.targetType === "shopFilter" ? "sort=new or category=Sarees" : "/shop"}
                    />
                  )}
                </label>
              </div>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 hover:underline"
                  onClick={() => removeCircle(it.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addCircle}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
          >
            + Add circle
          </button>
        </div>
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
          onClick={addPromoBannerSection}
          className="rounded-full border border-crown-300 bg-white px-5 py-2.5 text-sm font-semibold text-crown-900 hover:bg-crown-50"
        >
          + Add promo banner
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
          <li
            key={section.id}
            draggable
            onDragStart={() => setDraggingSectionId(section.id)}
            onDragEnd={() => setDraggingSectionId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (draggingSectionId) reorderSectionByDrop(draggingSectionId, section.id);
            }}
            className={`min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm ${draggingSectionId === section.id ? "border-crown-400" : "border-zinc-200"}`}
          >
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
                  {section.type === "carousel" ? "Carousel" : section.type === "grid" ? "Grid" : "Promo banner"} · order {section.order}
                </p>
                <p className="break-words font-medium text-zinc-900">{section.title}</p>
                <p className="text-xs text-zinc-500">
                  {section.type === "promoBanner" ? "Gradient image banner" : `${section.productIds.length} product(s)`}
                </p>
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
                      value={section.type === "promoBanner" ? "" : section.eyebrow}
                      onChange={(e) => patchSection(section.id, { eyebrow: e.target.value } as Partial<DynamicHomeSection>)}
                      disabled={section.type === "promoBanner"}
                    />
                  </label>
                </div>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <label className="block min-w-0 text-xs font-semibold text-zinc-600">
                    Layout
                    <select
                      className="mt-1 box-border min-h-10 w-full min-w-0 max-w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      value={section.type}
                      onChange={(e) => {
                        const nextType = e.target.value as DynamicHomeSection["type"];
                        setPayload((p) => ({
                          ...p,
                          sections: p.sections.map((s) => {
                            if (s.id !== section.id || s.type === nextType) return s;
                            if (nextType === "promoBanner") {
                              return {
                                id: s.id,
                                type: "promoBanner",
                                enabled: s.enabled,
                                order: s.order,
                                transition: s.transition,
                                title: s.title,
                                subtitle: "",
                                imageUrl: "",
                                targetHref: s.type === "promoBanner" ? s.targetHref : s.viewAllHref || "/shop",
                                gradientFrom: "#7f1530",
                                gradientTo: "#a0173c"
                              } as DynamicPromoBannerSection;
                            }
                            const prevViewAll = s.type === "promoBanner" ? s.targetHref : s.viewAllHref;
                            return {
                              id: s.id,
                              title: s.title,
                              eyebrow: s.type === "promoBanner" ? "Shop" : s.eyebrow,
                              type: nextType,
                              enabled: s.enabled,
                              order: s.order,
                              productIds: [],
                              transition: s.transition,
                              viewAllHref: prevViewAll || "/shop"
                            } as DynamicProductSection;
                          })
                        }));
                      }}
                    >
                      <option value="carousel">Carousel</option>
                      <option value="grid">Grid</option>
                      <option value="promoBanner">Promo banner</option>
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
                {section.type === "promoBanner" ? (
                  <div className="space-y-4">
                    <label className="block text-xs font-semibold text-zinc-600">
                      Subtitle
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={section.subtitle ?? ""}
                        onChange={(e) => patchSection(section.id, { subtitle: e.target.value })}
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-zinc-600">
                        Gradient from
                        <input
                          type="color"
                          className="mt-1 h-10 w-full rounded-lg border border-zinc-300 px-1 py-1"
                          value={section.gradientFrom}
                          onChange={(e) => patchSection(section.id, { gradientFrom: e.target.value })}
                        />
                      </label>
                      <label className="block text-xs font-semibold text-zinc-600">
                        Gradient to
                        <input
                          type="color"
                          className="mt-1 h-10 w-full rounded-lg border border-zinc-300 px-1 py-1"
                          value={section.gradientTo}
                          onChange={(e) => patchSection(section.id, { gradientTo: e.target.value })}
                        />
                      </label>
                    </div>
                    <label className="block text-xs font-semibold text-zinc-600">
                      Redirect URL
                      <input
                        type="text"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono text-xs"
                        placeholder="/shop?occasion=Wedding"
                        value={section.targetHref}
                        onChange={(e) => patchSection(section.id, { targetHref: e.target.value })}
                      />
                    </label>
                    <label className="block text-xs font-semibold text-zinc-600">
                      Upload banner image
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="mt-1 block w-full text-sm"
                        onChange={(e) => void uploadPromoImage(section.id, e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <label className="block text-xs font-semibold text-zinc-600">
                      Image URL
                      <input
                        type="url"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        value={section.imageUrl}
                        onChange={(e) => patchSection(section.id, { imageUrl: e.target.value })}
                      />
                    </label>
                    {section.imageUrl ? (
                      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin runtime URLs */}
                        <img
                          src={section.imageUrl}
                          alt="Promo banner preview"
                          className="h-40 w-full rounded-xl object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
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
                  </>
                )}
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
