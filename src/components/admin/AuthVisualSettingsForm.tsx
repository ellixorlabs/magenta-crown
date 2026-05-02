"use client";

import { useState } from "react";

type Props = {
  initialUrl: string;
  initialSizeChartUrl: string;
};

export function AuthVisualSettingsForm({ initialUrl, initialSizeChartUrl }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [sizeChartUrl, setSizeChartUrl] = useState(initialSizeChartUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onFileChange(file: File | null) {
    if (!file) return;
    setMessage(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("productId", "auth-pages");
      const res = await fetch("/api/admin/product-image", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setMessage(json.error || "Upload failed.");
        return;
      }
      setUrl(json.url);
      setMessage("Image uploaded. Save to apply on auth pages.");
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
        body: JSON.stringify({ imageUrl: url.trim(), globalSizeChartImageUrl: sizeChartUrl.trim() })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(json.error || "Save failed.");
        return;
      }
      setMessage("Saved.");
    } catch {
      setMessage("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Auth visual image</p>
      <label className="block text-xs font-semibold text-zinc-600">
        Upload auth panel image
        <input
          type="file"
          accept="image/jpeg,image/png"
          className="mt-1 block w-full text-sm"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </label>
      {url ? <img src={url} alt="Auth visual preview" className="h-44 w-full rounded-2xl object-cover" /> : null}
      <label className="block text-xs font-semibold text-zinc-600">
        Image URL
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <div className="border-t border-zinc-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Global size chart image</p>
        <label className="mt-2 block text-xs font-semibold text-zinc-600">
          Upload size chart image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block w-full text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) return;
              setUploading(true);
              setMessage(null);
              try {
                const form = new FormData();
                form.append("file", file);
                form.append("productId", "global-size-chart");
                const res = await fetch("/api/admin/product-image", { method: "POST", body: form });
                const json = (await res.json()) as { url?: string; error?: string };
                if (!res.ok || !json.url) {
                  setMessage(json.error || "Upload failed.");
                  return;
                }
                setSizeChartUrl(json.url);
                setMessage("Size chart uploaded. Save to apply globally.");
              } catch {
                setMessage("Upload failed.");
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        {sizeChartUrl ? (
          <img src={sizeChartUrl} alt="Global size chart preview" className="mt-2 h-44 w-full rounded-2xl object-contain bg-zinc-50" />
        ) : null}
        <label className="mt-3 block text-xs font-semibold text-zinc-600">
          Size chart URL
          <input
            type="url"
            value={sizeChartUrl}
            onChange={(e) => setSizeChartUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
      <button
        type="submit"
        disabled={saving || uploading}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

