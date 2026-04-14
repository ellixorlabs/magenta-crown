"use client";

import { useFormStatus } from "react-dom";
import { HERO_TRANSITION_OPTIONS, type HeroTransitionId } from "@/lib/hero-transition";
import { updateHeroCarouselTransition } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-crown-800 px-5 py-2 text-sm font-semibold text-white hover:bg-crown-900 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save transition"}
    </button>
  );
}

type Props = {
  current: HeroTransitionId;
};

export function HeroTransitionForm({ current }: Props) {
  return (
    <form
      action={updateHeroCarouselTransition}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-zinc-900">Slide transition</h3>
      <p className="mt-1 text-xs text-zinc-500">
        How the storefront hero moves from one slide to the next (images only; timing is unchanged).
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-[min(100%,20rem)] flex-1 flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-zinc-500">Transition</span>
          <select
            name="transition"
            defaultValue={current}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            {HERO_TRANSITION_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton />
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        {HERO_TRANSITION_OPTIONS.find((o) => o.id === current)?.description}
      </p>
    </form>
  );
}
