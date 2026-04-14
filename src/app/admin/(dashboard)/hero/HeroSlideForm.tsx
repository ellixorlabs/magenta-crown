"use client";

import type { HeroSlide } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageFocusPicker } from "@/components/admin/ImageFocusPicker";
import { deleteHeroSlide, saveHeroSlide } from "./actions";

type Props = {
  slide?: HeroSlide;
  defaultSortOrder?: number;
};

export function HeroSlideForm({ slide, defaultSortOrder = 0 }: Props) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(slide?.imageUrl ?? "");
  const [imagePosition, setImagePosition] = useState(slide?.imagePosition ?? "center");

  async function submitSlide(formData: FormData) {
    await saveHeroSlide(formData);
    router.refresh();
  }

  async function removeSlide(formData: FormData) {
    await deleteHeroSlide(formData);
    router.refresh();
  }

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
          <label className="text-xs font-semibold uppercase text-zinc-500">Image URL</label>
          <input
            name="imageUrl"
            required
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
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
