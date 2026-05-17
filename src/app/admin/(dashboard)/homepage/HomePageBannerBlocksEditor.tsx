"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { compressImageFileForUpload } from "@/lib/client-image-compress";
import type { HomePageBannerRow } from "@/lib/home-page-banner";
import { createEmptyHomePageBanner } from "@/lib/home-page-banner";
import { saveHomePageBanners, type SaveHomePageBannersResult } from "./actions";

type UploadMeta = { width: number; height: number; bytes: number };

type Props = {
  initialBanners: HomePageBannerRow[];
};

export function HomePageBannerBlocksEditor({ initialBanners }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<HomePageBannerRow[]>(() => normalizeRows(initialBanners));
  const [meta, setMeta] = useState<Record<string, { desktop?: UploadMeta; mobile?: UploadMeta }>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setRows(normalizeRows(initialBanners));
  }, [initialBanners]);

  const persist = useCallback(() => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const payload = rows.map((r, i) => ({
        id: r.id,
        desktopImageUrl: r.desktopImageUrl.trim(),
        mobileImageUrl: r.mobileImageUrl.trim(),
        redirectUrl: r.redirectUrl.trim() || "/shop",
        title: r.title.trim() || "Banner",
        sortOrder: i,
        isVisible: r.isVisible,
        createdAt: r.createdAt
      }));
      console.log("BANNER SAVE START (client)", { rowCount: payload.length, payload });
      try {
        const result: SaveHomePageBannersResult = await saveHomePageBanners(payload);
        console.log("BANNER SAVE CLIENT RESULT", result);
        if (!result.ok) {
          setError([result.error, result.detail].filter(Boolean).join(" — "));
          return;
        }
        console.log("DB SAVE OK (client)", result.returnedIds);
        setSuccess(`Saved ${result.saved} banner block(s).`);
        router.refresh();
      } catch (e) {
        console.error("BANNER SAVE CLIENT THROW", e instanceof Error ? e.stack : e);
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }, [rows, router]);

  const patchRow = useCallback((id: string, patch: Partial<HomePageBannerRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const uploadVariant = useCallback(
    async (bannerId: string, variant: "desktop" | "mobile", file: File | null) => {
      if (!file) return;
      setError(null);
      setSuccess(null);
      setUploadingKey(`${bannerId}-${variant}`);
      try {
        const prepared = await compressImageFileForUpload(file, {
          maxWidthOrHeight: variant === "desktop" ? 2200 : 960,
          maxSizeMB: 1.85
        });
        const fd = new FormData();
        fd.append("file", prepared);
        fd.append("scope", "banner");
        fd.append("bannerVariant", variant);
        const res = await fetch("/api/admin/homepage-image", { method: "POST", body: fd });
        const json = (await res.json()) as { url?: string; error?: string; width?: number; height?: number; bytes?: number };
        console.log("UPLOAD RESULT (client)", res.status, json);
        if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
        const url = json.url.trim();
        patchRow(bannerId, variant === "desktop" ? { desktopImageUrl: url } : { mobileImageUrl: url });
        setMeta((m) => ({
          ...m,
          [bannerId]: {
            ...m[bannerId],
            [variant]:
              typeof json.width === "number" && typeof json.height === "number" && typeof json.bytes === "number"
                ? { width: json.width, height: json.height, bytes: json.bytes }
                : {
                    width: 0,
                    height: 0,
                    bytes: prepared.size
                  }
          }
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploadingKey(null);
      }
    },
    [patchRow]
  );

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyHomePageBanner()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    if (!confirm("Remove this banner block?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const moveRow = useCallback((id: string, dir: -1 | 1) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j]!, copy[idx]!];
      return copy;
    });
  }, []);

  const reorderByDrop = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setRows((prev) => {
      const from = prev.findIndex((r) => r.id === fromId);
      const to = prev.findIndex((r) => r.id === toId);
      if (from < 0 || to < 0) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved!);
      return copy;
    });
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Homepage banners</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
            Desktop image shows from the Tailwind <code className="rounded bg-zinc-100 px-1">lg</code> breakpoint
            (1024px) upward; mobile image below that. Each block has its own title and redirect. Add a{" "}
            <strong>Banner carousel</strong> section in the list below to control where this carousel appears on the
            page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addRow}
            className="rounded-full border border-crown-300 bg-white px-4 py-2 text-sm font-semibold text-crown-900 hover:bg-crown-50"
          >
            + Add banner
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void persist()}
            className="rounded-full bg-crown-800 px-4 py-2 text-sm font-semibold text-white hover:bg-crown-900 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save banners"}
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {rows.map((row, index, arr) => (
          <div
            key={row.id}
            draggable
            onDragStart={() => setDragId(row.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) reorderByDrop(dragId, row.id);
            }}
            className={`rounded-xl border bg-zinc-50/60 p-4 ${dragId === row.id ? "border-crown-400" : "border-zinc-200"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Block {index + 1} · sort {index}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => moveRow(row.id, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 disabled:opacity-30"
                  disabled={index === arr.length - 1}
                  onClick={() => moveRow(row.id, 1)}
                >
                  Down
                </button>
                <label className="flex items-center gap-1.5 text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    checked={row.isVisible}
                    onChange={(e) => patchRow(row.id, { isVisible: e.target.checked })}
                  />
                  Visible
                </label>
                <button type="button" className="text-xs font-semibold text-red-600 hover:underline" onClick={() => removeRow(row.id)}>
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="block text-xs font-semibold text-zinc-600">
                Title
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  value={row.title}
                  onChange={(e) => patchRow(row.id, { title: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold text-zinc-600">
                Redirect URL
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
                  value={row.redirectUrl}
                  onChange={(e) => patchRow(row.id, { redirectUrl: e.target.value })}
                  placeholder="/shop"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-600">
                  Desktop image (≥1024px)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-1 block w-full text-sm"
                    disabled={uploadingKey === `${row.id}-desktop`}
                    onChange={(e) => void uploadVariant(row.id, "desktop", e.target.files?.[0] ?? null)}
                  />
                </label>
                {meta[row.id]?.desktop ? (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {meta[row.id]!.desktop!.width}×{meta[row.id]!.desktop!.height}px · {(meta[row.id]!.desktop!.bytes / 1024).toFixed(1)} KB
                  </p>
                ) : null}
                <div className="relative mt-2 aspect-[16/9] w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                  {row.desktopImageUrl.trim() ? (
                    <Image
                      key={row.desktopImageUrl.trim()}
                      src={row.desktopImageUrl.trim()}
                      alt="Desktop preview"
                      fill
                      sizes="(max-width: 1024px) 0vw, 480px"
                      className="object-cover object-center"
                      unoptimized
                    />
                  ) : null}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600">
                  Mobile image (viewports below 1024px)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-1 block w-full text-sm"
                    disabled={uploadingKey === `${row.id}-mobile`}
                    onChange={(e) => void uploadVariant(row.id, "mobile", e.target.files?.[0] ?? null)}
                  />
                </label>
                {meta[row.id]?.mobile ? (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {meta[row.id]!.mobile!.width}×{meta[row.id]!.mobile!.height}px · {(meta[row.id]!.mobile!.bytes / 1024).toFixed(1)} KB
                  </p>
                ) : null}
                <div className="relative mt-2 aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                  {row.mobileImageUrl.trim() ? (
                    <Image
                      key={row.mobileImageUrl.trim()}
                      src={row.mobileImageUrl.trim()}
                      alt="Mobile preview"
                      fill
                      sizes="220px"
                      className="object-cover object-center"
                      unoptimized
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-600">
          No banner blocks yet. Click <strong>Add banner</strong> to create one, then add a <strong>Banner carousel</strong>{" "}
          section below to place it on the storefront.
        </p>
      )}

      {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function normalizeRows(banners: HomePageBannerRow[]): HomePageBannerRow[] {
  return [...banners]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((r, i) => ({ ...r, sortOrder: i }));
}
