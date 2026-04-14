/** Stored in HeroCarouselSettings.transition and used by LandingHero */

export type HeroTransitionId =
  | "wipe"
  | "fade"
  | "fadeIn"
  | "fadeOut"
  | "slideFade"
  | "zoomFade"
  | "none";

export const HERO_TRANSITION_OPTIONS: { id: HeroTransitionId; label: string; description: string }[] = [
  { id: "wipe", label: "Wipe", description: "Next slide moves in horizontally over the current." },
  { id: "fade", label: "Crossfade", description: "New image fades in over the previous." },
  { id: "fadeIn", label: "Fade in", description: "Incoming image fades in (soft reveal)." },
  { id: "fadeOut", label: "Fade out", description: "Current image fades away to reveal the next." },
  { id: "slideFade", label: "Slide + fade", description: "Slight slide with opacity (smooth directional)." },
  { id: "zoomFade", label: "Zoom + fade", description: "Subtle zoom out with fade." },
  { id: "none", label: "None (instant)", description: "No animation between slides." }
];

const ALLOWED = new Set<string>(HERO_TRANSITION_OPTIONS.map((o) => o.id));

export function parseHeroTransition(raw: string | null | undefined): HeroTransitionId {
  const s = (raw ?? "").trim();
  if (ALLOWED.has(s)) return s as HeroTransitionId;
  return "wipe";
}

export const TRANS_MS = 640;
/** Slightly longer opacity for “Fade in” preset */
export const TRANS_FADE_IN_MS = 780;
export const TRANS_EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
