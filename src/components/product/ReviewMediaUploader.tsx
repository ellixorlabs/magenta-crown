"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { compressImageFileForUpload } from "@/lib/client-image-compress";

const MAX_IMAGES = 6;
const MAX_BATCH_BYTES = 6 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

type Remote = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  type: string;
};

type LocalImg = { key: string; file: File; preview: string };

export function ReviewMediaUploader({ reviewId }: { reviewId: string }) {
  const [locals, setLocals] = useState<LocalImg[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [remote, setRemote] = useState<Remote[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  const revokeLocals = useCallback((list: LocalImg[]) => {
    for (const l of list) URL.revokeObjectURL(l.preview);
  }, []);

  const addLocalImages = useCallback(
    (files: FileList | File[]) => {
      setErr(null);
      const arr = [...files].filter((f) => f.type.startsWith("image/"));
      setLocals((prev) => {
        const next = [...prev];
        for (const f of arr) {
          if (next.length + remote.filter((r) => r.type === "IMAGE").length >= MAX_IMAGES) break;
          next.push({ key: `${f.name}-${f.size}-${Math.random()}`, file: f, preview: URL.createObjectURL(f) });
        }
        return next;
      });
    },
    [remote]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addLocalImages(e.dataTransfer.files);
  };

  const removeLocal = (key: string) => {
    setLocals((prev) => {
      const x = prev.find((p) => p.key === key);
      if (x) URL.revokeObjectURL(x.preview);
      return prev.filter((p) => p.key !== key);
    });
  };

  const removeRemote = async (id: string) => {
    setErr(null);
    const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/media/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      setErr("Could not remove file.");
      return;
    }
    setRemote((r) => r.filter((x) => x.id !== id));
  };

  const uploadAll = async () => {
    setErr(null);
    setBusy(true);
    try {
      const imgSlotsUsed = remote.filter((r) => r.type === "IMAGE").length;
      if (locals.length + imgSlotsUsed > MAX_IMAGES) {
        setErr(`Max ${MAX_IMAGES} images.`);
        return;
      }
      let total = 0;
      const compressed: File[] = [];
      for (const l of locals) {
        const c = await compressImageFileForUpload(l.file, { maxWidthOrHeight: 1920, maxSizeMB: 0.9 });
        total += c.size;
        compressed.push(c);
        if (total > MAX_BATCH_BYTES) {
          setErr("Photos exceed 6MB total after compression. Remove some and try again.");
          return;
        }
      }

      let acc: Remote[] = [...remote];
      for (let i = 0; i < compressed.length; i++) {
        setProgress(`Uploading image ${i + 1}/${compressed.length}…`);
        const fd = new FormData();
        fd.set("kind", "image");
        fd.append("images", compressed[i]!);
        const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/media`, { method: "POST", body: fd });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || "Image upload failed");
        }
        const body = (await res.json()) as { media?: Remote[] };
        const rows = Array.isArray(body.media) ? body.media : [];
        acc = [...acc, ...rows];
        setRemote(acc);
      }
      revokeLocals(locals);
      setLocals([]);

      if (video) {
        if (video.size > MAX_VIDEO_BYTES) {
          setErr("Video must be under 20MB.");
          return;
        }
        if (acc.some((r) => r.type === "VIDEO")) {
          setErr("Only one video per review.");
          return;
        }
        setProgress("Uploading video…");
        const fd = new FormData();
        fd.set("kind", "video");
        fd.set("file", video);
        const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/media`, { method: "POST", body: fd });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || "Video upload failed");
        }
        const body = (await res.json()) as { media?: Remote };
        if (body.media) {
          acc = [...acc, body.media];
          setRemote(acc);
        }
        setVideo(null);
      }
      setProgress(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const hasRemoteVideo = remote.some((r) => r.type === "VIDEO");

  return (
    <div
      className="mt-4 space-y-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <p className="text-sm font-semibold text-zinc-900">Add photos or a short video (optional)</p>
      <p className="text-xs text-zinc-500">Up to 6 images (6MB total), WebP on server. One video max (20MB MP4/WebM/MOV).</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || remote.filter((r) => r.type === "IMAGE").length + locals.length >= MAX_IMAGES}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
          onClick={() => imgInputRef.current?.click()}
        >
          Choose photos
        </button>
        <button
          type="button"
          disabled={busy || hasRemoteVideo || !!video}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-40"
          onClick={() => vidInputRef.current?.click()}
        >
          Choose video
        </button>
        <button
          type="button"
          disabled={busy || (locals.length === 0 && !video)}
          className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40"
          onClick={() => void uploadAll()}
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>

      <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addLocalImages(e.target.files)} />
      <input ref={vidInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />

      {progress ? <p className="text-xs text-zinc-600">{progress}</p> : null}
      {err ? <p className="text-xs text-red-600">{err}</p> : null}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {locals.map((l) => (
          <div key={l.key} className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <Image src={l.preview} alt="" fill className="object-cover" unoptimized />
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white"
              onClick={() => removeLocal(l.key)}
            >
              ×
            </button>
          </div>
        ))}
        {remote.map((r) => (
          <div key={r.id} className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {r.type === "IMAGE" ? (
              <Image src={r.thumbnailUrl || r.url} alt="" fill className="object-cover" loading="lazy" sizes="120px" unoptimized />
            ) : (
              <video src={r.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
            )}
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white"
              onClick={() => void removeRemote(r.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {video ? (
        <p className="text-xs text-zinc-600">
          Video ready: {video.name} ({(video.size / (1024 * 1024)).toFixed(2)} MB)
          <button type="button" className="ml-2 font-semibold text-red-600 hover:underline" onClick={() => setVideo(null)}>
            Remove
          </button>
        </p>
      ) : null}
    </div>
  );
}
