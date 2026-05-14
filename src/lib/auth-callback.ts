/** Where to land after Google OAuth if `next` query is missing (Safari / provider strips). */
export const MC_OAUTH_RETURN_STORAGE_KEY = "mc_oauth_return";

/**
 * Set in the originating client (e.g. installed PWA) immediately before redirecting to Google.
 * Survives when the user returns to that same client tab; not shared with Safari on iOS.
 */
export const MC_OAUTH_PENDING_EXTERNAL_KEY = "mc_oauth_pending_external";

/** Query flag appended to `next` when OAuth began from an installed PWA (Safari may hold the session instead). */
export const MC_OAUTH_URL_QUERY = "mc_oauth";

/** Prevent open redirects: only same-site relative paths. */

export function getSafeCallbackUrl(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/";
  let t = raw.trim();
  try {
    t = decodeURIComponent(t);
  } catch {
    return "/";
  }
  if (!t.startsWith("/")) return "/";
  if (t.startsWith("//")) return "/";
  if (t.includes("://")) return "/";
  if (t.includes("/../") || t.includes("\\") || t === "/..") return "/";
  try {
    const u = new URL(t, "https://placeholder.invalid");
    if (u.pathname.split("/").includes("..")) return "/";
    return `${u.pathname}${u.search}`.slice(0, 2048);
  } catch {
    return "/";
  }
}

/** Same-tab fallback when providers strip the `next` query on `/auth/callback` (not visible across iOS Safari vs PWA). */
export function rememberOAuthReturnForCallback(relativePath: string): void {
  if (typeof window === "undefined") return;
  const safe = getSafeCallbackUrl(relativePath);
  try {
    sessionStorage.setItem(MC_OAUTH_RETURN_STORAGE_KEY, safe);
  } catch {
    /* ignore */
  }
}

/** Mark post-login URL when OAuth started from standalone PWA (downstream UX only). */
export function appendMcOAuthHintToNextPath(relativePath: string, hint: "pwa"): string {
  const safe = getSafeCallbackUrl(relativePath);
  try {
    const u = new URL(safe, "https://placeholder.invalid");
    u.searchParams.set(MC_OAUTH_URL_QUERY, hint);
    return `${u.pathname}${u.search}`.slice(0, 2048);
  } catch {
    return safe;
  }
}
