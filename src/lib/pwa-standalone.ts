/**
 * iOS Safari “Add to Home Screen” or Android installed PWA.
 *
 * iOS note: the standalone WebView and the full Safari app do not share the same cookie /
 * storage partition. OAuth that opens in Safari therefore cannot populate this client’s
 * Supabase storage or this app’s httpOnly session cookie; see AuthContext resync + OAuth hint.
 *
 * Uses both `(display-mode: standalone)` and legacy `navigator.standalone` (iOS) so OAuth
 * `redirectTo` / `oauth_context` flags match the actual display mode.
 */
export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)");
  if (mq?.matches) return true;
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}
