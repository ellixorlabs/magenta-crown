"use client";

import { Loader2, Play } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  src: string;
  title?: string;
};

export function LazyProductVideo({ src, title = "Product video" }: Props) {
  const [load, setLoad] = useState(false);
  const [playing, setPlaying] = useState(false);

  const onLoaded = useCallback(() => {
    setPlaying(true);
  }, []);

  if (!load) {
    return (
      <button
        type="button"
        onClick={() => setLoad(true)}
        className="group relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 text-left shadow-sm transition hover:border-zinc-300"
      >
        <div className="mc-shimmer absolute inset-0 opacity-90" aria-hidden />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/10">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-crown-800 shadow-md transition group-hover:scale-105">
            <Play className="ml-0.5 h-7 w-7 fill-current" aria-hidden />
          </span>
          <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-zinc-800 shadow-sm">Load video</span>
        </span>
        <span className="sr-only">Load and play {title}</span>
      </button>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 bg-black/5">
      {!playing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-100" aria-busy>
          <Loader2 className="h-9 w-9 animate-spin text-crown-700" aria-hidden />
          <span className="sr-only">Loading video…</span>
        </div>
      )}
      <video
        src={src}
        controls
        className="relative z-[1] h-full w-full"
        preload="metadata"
        onLoadedData={onLoaded}
        onCanPlay={onLoaded}
        playsInline
      />
    </div>
  );
}
