"use client";

import Image from "next/image";
import { useState } from "react";
import type { BrandSettings } from "@/lib/brand-settings";

type Props = {
  initial: BrandSettings;
  initialShareTemplate: string;
};

export function BrandAssetsSettingsForm({ initial, initialShareTemplate }: Props) {
  const [faviconUrl, setFaviconUrl] = useState(initial.faviconUrl);
  const [breathingLogoUrl, setBreathingLogoUrl] = useState(initial.breathingLogoUrl);
  const [brandMarkMode, setBrandMarkMode] = useState<"text" | "image">(initial.brandMarkMode);
  const [brandText, setBrandText] = useState(initial.brandText);
  const [brandImageUrl, setBrandImageUrl] = useState(initial.brandImageUrl);
  const [brandFontFamily, setBrandFontFamily] = useState(initial.brandFontFamily);
  const [shareMessageTemplate, setShareMessageTemplate] = useState(initialShareTemplate);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadAsset(kind: "favicon" | "breathing-logo" | "brand-mark-image", file: File | null) {
    if (!file) return;
    setMessage(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const res = await fetch("/api/admin/brand-assets", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setMessage(json.error || "Upload failed.");
        return;
      }
      if (kind === "favicon") setFaviconUrl(json.url);
      if (kind === "breathing-logo") setBreathingLogoUrl(json.url);
      if (kind === "brand-mark-image") setBrandImageUrl(json.url);
      setMessage("Upload complete. Save to apply.");
    } catch {
      setMessage("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/others/auth-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faviconUrl: faviconUrl.trim(),
          breathingLogoUrl: breathingLogoUrl.trim(),
          brandMarkMode,
          brandText: brandText.trim(),
          brandImageUrl: brandImageUrl.trim(),
          brandFontFamily: brandFontFamily.trim(),
          shareMessageTemplate: shareMessageTemplate.trim()
        })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error || "Save failed.");
        return;
      }
      setMessage("Brand settings saved.");
    } catch {
      setMessage("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Brand assets</p>
      <label className="block text-xs font-semibold text-zinc-600">
        Favicon upload
        <input
          type="file"
          accept=".ico,image/png,image/svg+xml,image/webp"
          className="mt-1 block w-full text-sm"
          onChange={(e) => void uploadAsset("favicon", e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="block text-xs font-semibold text-zinc-600">
        Favicon URL
        <input
          type="text"
          value={faviconUrl}
          onChange={(e) => setFaviconUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-xs font-semibold text-zinc-600">
        Breathing logo upload
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="mt-1 block w-full text-sm"
          onChange={(e) => void uploadAsset("breathing-logo", e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="block text-xs font-semibold text-zinc-600">
        Breathing logo URL
        <input
          type="text"
          value={breathingLogoUrl}
          onChange={(e) => setBreathingLogoUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-zinc-600">
          Header brand mode
          <select
            value={brandMarkMode}
            onChange={(e) => setBrandMarkMode(e.target.value as "text" | "image")}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-zinc-600">
          Header brand font (CSS font-family)
          <input
            type="text"
            value={brandFontFamily}
            onChange={(e) => setBrandFontFamily(e.target.value)}
            placeholder='e.g. "Cinzel, serif"'
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block text-xs font-semibold text-zinc-600">
        Header brand text
        <input
          type="text"
          value={brandText}
          onChange={(e) => setBrandText(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-semibold text-zinc-600">
        Header brand image upload
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="mt-1 block w-full text-sm"
          onChange={(e) => void uploadAsset("brand-mark-image", e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="block text-xs font-semibold text-zinc-600">
        Header brand image URL
        <input
          type="text"
          value={brandImageUrl}
          onChange={(e) => setBrandImageUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-semibold text-zinc-600">
        Product share message template
        <textarea
          value={shareMessageTemplate}
          onChange={(e) => setShareMessageTemplate(e.target.value)}
          className="mt-1 min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Hi! I found this amazing dress on Magenta Crown. Take a look: {productUrl}"
        />
        <span className="mt-1 block text-[11px] font-normal text-zinc-500">
          Tokens: <code>{`{productName}`}</code>, <code>{`{productUrl}`}</code>, <code>{`{couponCode}`}</code>,{" "}
          <code>{`{couponLine}`}</code>.
        </span>
      </label>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Live preview</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Favicon</p>
            <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
              {faviconUrl ? (
                <Image src={faviconUrl} alt="Favicon preview" width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
              ) : (
                <span className="text-[10px] text-zinc-400">None</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Breathing logo</p>
            <div className="mt-2 flex h-16 items-center justify-center rounded-lg border border-zinc-200 bg-[#6d1432]">
              {breathingLogoUrl ? (
                <Image
                  src={breathingLogoUrl}
                  alt="Breathing logo preview"
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                  unoptimized
                />
              ) : (
                <span className="text-[10px] text-white/70">Default logo</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Header brand mark</p>
            <div className="mt-2 flex h-16 items-center rounded-lg border border-zinc-200 bg-zinc-900 px-3">
              {brandMarkMode === "image" && brandImageUrl ? (
                <Image
                  src={brandImageUrl}
                  alt={brandText || "Brand mark preview"}
                  width={180}
                  height={32}
                  className="h-8 w-auto max-w-[180px] object-contain"
                  unoptimized
                />
              ) : (
                <span
                  className="block whitespace-nowrap text-xs font-semibold tracking-[0.18em] text-white sm:text-sm"
                  style={brandFontFamily ? { fontFamily: brandFontFamily } : undefined}
                >
                  {brandText || "MAGENTA CROWN"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
      <button
        type="submit"
        disabled={saving || uploading}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save brand settings"}
      </button>
    </form>
  );
}
