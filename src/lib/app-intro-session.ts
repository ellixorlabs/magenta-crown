const INTRO_SEEN_KEY = "mc-app-intro-seen";

/** True after first breathing-logo intro this browser tab session (PWA or web). */
export function hasSeenAppIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAppIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* private mode / quota */
  }
}
