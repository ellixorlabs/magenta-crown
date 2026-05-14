"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { compressImageFileForUpload } from "@/lib/client-image-compress";
import { normalizeAdminImageUrl } from "@/lib/admin-image-url";
import { adminRemoteImageSrcUnoptimized } from "@/lib/admin-next-image";

const MAX_UPLOAD_AFTER_COMPRESS = 8 * 1024 * 1024;

type Props = {
  productId: string;
  defaultUrl: string;
  defaultShow: boolean;
};

export function AdminSizeChartFormFields({ productId, defaultUrl, defaultShow }: Props) {
  const [url, setUrl] = useState(() => defaultUrl.trim());
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setUrl(defaultUrl.trim());
  }, [defaultUrl]);

  const onUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        window.alert("Use JPEG, PNG, or WEBP for the size chart.");
        return;
      }
      setUploading(true);
      try {
        const prepared = await compressImageFileForUpload(file);
        if (prepared.size > MAX_UPLOAD_AFTER_COMPRESS) {
          window.alert("Image is still too large after compression (max 8MB).");
          return;
        }
        const fd = new FormData();
        fd.append("file", prepared);
        if (productId && productId !== "draft") fd.append("productId", productId);
        const res = await fetch("/api/admin/product-image", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        if (data.url) setUrl(normalizeAdminImageUrl(data.url));
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [productId]
  );

  return (
    <div className="sm:col-span-2 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-zinc-700">Size chart (PDP)</label>
        <select
          name="showSizeChart"
          defaultValue={defaultShow ? "true" : "false"}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-800"
        >
          <option value="true">Show size guide on storefront</option>
          <option value="false">Hide size guide on storefront</option>
        </select>
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Upload a chart image (table + diagram). If empty, the product uses the{" "}
        <strong className="text-zinc-700">global</strong> chart from Admin → Others when configured. The link only
        appears when a chart image is available and show is enabled.
      </p>
      <textarea
        name="sizeChartImageUrl"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        rows={2}
        placeholder="https://… or upload below"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-800"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50">
          {uploading ? "Uploading…" : "Upload chart image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading || productId === "draft"}
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
          />
        </label>
        {productId === "draft" ? (
          <span className="text-[11px] text-amber-700">Save the product first to upload; paste a URL for now.</span>
        ) : null}
      </div>
      {url ? (
        <div className="relative mx-auto max-h-48 max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <Image
            src={url}
            alt="Size chart preview"
            width={800}
            height={600}
            className="h-auto max-h-48 w-full object-contain"
            unoptimized={adminRemoteImageSrcUnoptimized(url)}
          />
        </div>
      ) : null}
    </div>
  );
}
