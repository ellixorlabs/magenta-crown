"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ImageFocusPicker } from "@/components/admin/ImageFocusPicker";
import { deleteHeroSlide, saveHeroSlide } from "./actions";

type HeroSlide = {
  id: string;
  imageUrl: string;
  imagePosition: string;
  eyebrow: string;
  sortOrder: number;
  line1: string;
  accent: string;
  sub1: string;
  sub2: string;
};

type Props = {
  slide?: HeroSlide;
  defaultSortOrder?: number;
};

export function HeroSlideForm({ slide, defaultSortOrder = 0 }: Props) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(slide?.imageUrl ?? "");
  const [imagePosition, setImagePosition] = useState(slide?.imagePosition ?? "center");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function submitSlide(formData: FormData) {
    await saveHeroSlide(formData);
    router.refresh();
  }

  async function removeSlide(formData: FormData) {
    await deleteHeroSlide(formData);
    router.refresh();
  }

  const uploadImage = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setUploadError(null);
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("sectionId", `hero-${slide?.id ?? "new"}`);
        const res = await fetch("/api/admin/homepage-image", { method: "POST", body: fd });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          throw new Error(json.error ?? "Upload failed");
        }
        setImageUrl(json.url);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [slide?.id]
  );

  return (
    <div
      className={
        "grid gap-4 rounded-2xl border border-zinc-200 p-6 lg:grid-cols-[minmax(0,220px)_1fr] " +
        (slide ? "bg-white" : "bg-zinc-50")
      }
    >
      <div className="min-w-0">
        <ImageFocusPicker
          src={imageUrl.trim() || null}
          value={imagePosition}
          onChange={setImagePosition}
          fit="cover"
          label="Focus & framing"
          defaultOrientation="landscape"
        />
      </div>

      <div>
        <form action={submitSlide} className="space-y-3">
          {slide ? <input type="hidden" name="id" value={slide.id} /> : null}
          <input type="hidden" name="imagePosition" value={imagePosition} />
          <input name="imageUrl" required value={imageUrl} readOnly className="sr-only" />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!uploading) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (uploading) return;
              void uploadImage(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`rounded-xl border-2 border-dashed p-4 text-sm transition ${
              dragActive ? "border-crown-500 bg-crown-50/60" : "border-zinc-300 bg-zinc-50"
            }`}
          >
            <p className="font-medium text-zinc-800">Upload hero image</p>
            <p className="mt-1 text-xs text-zinc-500">
              Drag and drop JPEG/PNG/WEBP, or choose from computer. Saved to Supabase bucket{" "}
              <span className="font-mono">homepage</span>.
            </p>
            <label className="mt-3 inline-block cursor-pointer rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  void uploadImage(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              {uploading ? "Uploading..." : "Choose image"}
            </label>
            {uploadError ? <p className="mt-2 text-xs text-red-600">{uploadError}</p> : null}
          </div>
          {imageUrl ? (
            <p className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">
              Uploaded URL: {imageUrl}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Eyebrow</label>
              <input
                name="eyebrow"
                defaultValue={slide?.eyebrow ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Sort order</label>
              <input
                name="sortOrder"
                type="number"
                defaultValue={slide?.sortOrder ?? defaultSortOrder}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Headline line 1</label>
            <input
              name="line1"
              required
              defaultValue={slide?.line1 ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Accent line</label>
            <input
              name="accent"
              required
              defaultValue={slide?.accent ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Supporting line 1</label>
            <input name="sub1" defaultValue={slide?.sub1 ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500">Supporting line 2</label>
            <input name="sub2" defaultValue={slide?.sub2 ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white">
              {slide ? "Save slide" : "Create slide"}
            </button>
          </div>
        </form>

        {slide ? (
          <form action={removeSlide} className="mt-3 inline-block">
            <input type="hidden" name="id" value={slide.id} />
            <button type="submit" className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-700">
              Delete slide
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
